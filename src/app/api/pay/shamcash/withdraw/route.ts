import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { createShamCashWithdrawal } from "@/lib/shamcashApi/client";
import { enqueueShamCashPayoutJob } from "@/lib/shamcashPayoutQueue";
import { runShamCashPlaywrightPayout } from "@/lib/shamcashPlaywrightPayout";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

const resolvePayoutMode = (): "API" | "QUEUE_PLAYWRIGHT" => {
  const raw = String(process.env.SHAMCASH_PAYOUT_MODE || "QUEUE_PLAYWRIGHT")
    .trim()
    .toUpperCase();

  return raw === "API" ? "API" : "QUEUE_PLAYWRIGHT";
};

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: t("غير مصرح", "Unauthorized") },
        { status: 401 },
      );
    }

    const sessionUserId = session.user.id;

    const rateLimitResponse = await enforceRateLimit({
      req,
      key: "pay:shamcash:withdraw:post",
      userId: sessionUserId,
      limit: 10,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من محاولات السحب، يرجى المحاولة بعد قليل",
        "Too many withdrawal requests. Please try again shortly.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = (await req.json()) as {
      walletCode?: string;
      amount?: number;
      note?: string;
      qrCode?: string;
    };

    const inputWalletCode = String(body.walletCode || "").trim();
    // Wallet code is now optional from UI; keep an internal identifier for logs/jobs.
    const walletCode = inputWalletCode || `UID-${sessionUserId}`;
    const amount = Number(body.amount ?? 0);
    const inputNote = String(body.note || "").trim();
    const qrCode = String(body.qrCode || "").trim();

    if (!qrCode) {
      return NextResponse.json(
        {
          message: t(
            "يرجى إدخال كود QR الخاص بمحفظة شام كاش",
            "ShamCash QR code is required",
          ),
        },
        { status: 400 },
      );
    }

    if (qrCode.length > 4_000_000) {
      return NextResponse.json(
        {
          message: t(
            "حجم بيانات QR كبير جداً. يرجى رفع صورة أصغر.",
            "QR payload is too large. Please upload a smaller image.",
          ),
        },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Withdrawal amount must be greater than 0",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const defaultWithdrawalNote = t(
      `لقد سحبت مبلغ ${amount.toFixed(2)} USD من موقع الدليل الآمن.`,
      `You withdrew ${amount.toFixed(2)} USD from Dalil Safe platform.`,
    );
    const note = inputNote || defaultWithdrawalNote;

    const user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: {
        id: true,
        name: true,
        email: true,
        balance: true,
        isActive: true,
        isDeleted: true,
        activeUntil: true,
      },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json(
        { message: localizeErrorMessage("User not found", isArabic) },
        { status: 404 },
      );
    }

    const now = new Date();
    const isSubscriptionValid =
      user.isActive && user.activeUntil && new Date(user.activeUntil) > now;

    if (!isSubscriptionValid) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Subscription must be active to withdraw earnings according to program rules",
            isArabic,
          ),
        },
        { status: 403 },
      );
    }

    const currentBalance = Number(user.balance ?? 0);
    if (amount > currentBalance) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Insufficient ready balance for withdrawal",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const payoutMode = resolvePayoutMode();

    if (payoutMode === "API") {
      const reference = `BARROW-${user.id.slice(0, 8)}-${Date.now()}`;
      const shamCash = await createShamCashWithdrawal({
        walletCode,
        amount,
        note,
        reference,
        currency: "USD",
      });

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: {
              decrement: amount,
            },
          },
        });

        await tx.chargingLog.create({
          data: {
            userId: user.id,
            type: "SHAMCASH_API_WITHDRAWAL",
            amount: -Math.abs(amount),
          },
        });

        await tx.notification.create({
          data: {
            userId: user.id,
            title: t(
              "✅ تمت العملية بنجاح",
              "✅ Withdrawal completed successfully",
            ),
            message: t(
              `تمت عملية السحب بنجاح بقيمة ${amount.toFixed(2)} USD.`,
              `Your withdrawal was completed successfully (${amount.toFixed(2)} USD).`,
            ),
          },
        });
      });

      return NextResponse.json({
        success: true,
        transactionId: shamCash.transactionId,
        mode: payoutMode,
        message: t("تمت العملية بنجاح", "Withdrawal completed successfully"),
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    let queuedJobId = "";
    try {
      const job = await enqueueShamCashPayoutJob({
        userId: user.id,
        walletCode,
        amount,
        note,
        currency: "USD",
      });
      queuedJobId = job.id;
    } catch (queueError) {
      const queueMessage =
        queueError instanceof Error
          ? queueError.message
          : "Failed to queue ShamCash withdrawal";

      // If queue infrastructure is unavailable, attempt a direct Playwright payout.
      try {
        const reference = `BARROW-PLW-${user.id.slice(0, 8)}-${Date.now()}`;
        const payout = await runShamCashPlaywrightPayout({
          walletCode,
          amount,
          note,
          reference,
          currency: "USD",
        });

        await prisma.$transaction(async (tx) => {
          await tx.chargingLog.create({
            data: {
              userId: user.id,
              type: "SHAMCASH_PLAYWRIGHT_WITHDRAWAL",
              amount: -Math.abs(amount),
            },
          });

          await tx.notification.create({
            data: {
              userId: user.id,
              title: t(
                "✅ تمت العملية بنجاح",
                "✅ Withdrawal completed successfully",
              ),
              message: t(
                `تمت عملية السحب بنجاح بقيمة ${amount.toFixed(2)} USD.`,
                `Your withdrawal was completed successfully (${amount.toFixed(2)} USD).`,
              ),
            },
          });
        });

        return NextResponse.json({
          success: true,
          transactionId: payout.transactionId,
          mode: "PLAYWRIGHT_DIRECT",
          message: t("تمت العملية بنجاح", "Withdrawal completed successfully"),
          fallbackReason: queueMessage,
        });
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : "Playwright fallback withdrawal failed";

        await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: {
              increment: amount,
            },
          },
        });

        const automatedFailureReason = `${queueMessage} | ${fallbackMessage}`;
        const compactFailureReason =
          automatedFailureReason.length > 1900
            ? automatedFailureReason.slice(0, 1900)
            : automatedFailureReason;
        let manualRequestId = "";

        try {
          const manualRequest = await prisma.shamCashManualWithdrawal.create({
            data: {
              userId: user.id,
              amount,
              currency: "USD",
              walletCode,
              qrCode: qrCode || null,
              note,
              status: "PENDING_ADMIN",
              failureReason: compactFailureReason,
            },
            select: { id: true },
          });

          manualRequestId = manualRequest.id;

          const admins = await prisma.user.findMany({
            where: {
              isAdmin: true,
              isDeleted: false,
            },
            select: { id: true },
          });

          const userMessage = t(
            `طلب السحب بقيمة ${amount.toFixed(2)} USD قيد المراجعة حالياً.`,
            `Your withdrawal request (${amount.toFixed(2)} USD) is currently under review.`,
          );

          const displayName =
            user.name?.trim() || user.email?.trim() || user.id;

          const adminMessage = [
            t(
              `طلب سحب شام كاش للمستخدم ${displayName} يحتاج معالجة.`,
              `A ShamCash withdrawal request for ${displayName} needs processing.`,
            ),
            `SCW_REQUEST_ID:${manualRequest.id}`,
          ].join("\n");

          await Promise.all([
            prisma.notification.create({
              data: {
                userId: user.id,
                title: t(
                  "⏳ طلبك قيد المراجعة",
                  "⏳ Your request is under review",
                ),
                message: userMessage,
              },
            }),
            ...admins.map((admin) =>
              prisma.notification.create({
                data: {
                  userId: admin.id,
                  title: t(
                    "🚨 طلب سحب ShamCash يدوي جديد",
                    "🚨 New manual ShamCash withdrawal request",
                  ),
                  message: adminMessage,
                },
              }),
            ),
          ]);
        } catch (manualFallbackError) {
          const manualFallbackMessage =
            manualFallbackError instanceof Error
              ? manualFallbackError.message
              : "Failed to create manual fallback request";

          return NextResponse.json(
            {
              message: t(
                "تعذر تنفيذ السحب آلياً وتمت إعادة الرصيد، لكن فشل إنشاء الطلب اليدوي. يرجى التواصل مع الإدارة.",
                `Automated withdrawal failed and balance was restored, but creating manual fallback request failed. Please contact support. (${manualFallbackMessage})`,
              ),
            },
            { status: 503 },
          );
        }

        return NextResponse.json(
          {
            success: false,
            manualFallback: true,
            manualRequestId,
            mode: "MANUAL_ADMIN_FALLBACK",
            message: t(
              "تم استلام طلبك وهو قيد المراجعة الآن.",
              "Your request has been received and is now under review.",
            ),
            fallbackReason: compactFailureReason,
          },
          { status: 202 },
        );
      }
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: t("⏳ طلبك قيد المراجعة", "⏳ Your request is under review"),
        message: t(
          `طلب السحب بقيمة ${amount.toFixed(2)} USD قيد المراجعة حالياً.`,
          `Your withdrawal request (${amount.toFixed(2)} USD) is currently under review.`,
        ),
      },
    });

    return NextResponse.json({
      success: true,
      queued: true,
      payoutJobId: queuedJobId,
      mode: payoutMode,
      message: t(
        "تم استلام طلبك وهو قيد المراجعة الآن.",
        "Your request has been received and is now under review.",
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process ShamCash withdrawal";

    return NextResponse.json(
      {
        message: isArabic ? localizeErrorMessage(message, true) : message,
      },
      { status: 500 },
    );
  }
}
