import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";
import { verifyShamCashOutgoingTransferInHistory } from "@/lib/shamcashHistoryVerify";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { ShamCashManualWithdrawalStatus } from "@prisma/client";
import { recordPlatformProfitLedgerEntries } from "@/lib/platformProfitLedger";

const VALID_STATUSES = [
  "ALL",
  "PENDING_ADMIN",
  "VERIFYING",
  "COMPLETED",
  "REJECTED",
] as const;

type StatusFilter = (typeof VALID_STATUSES)[number];

const parseLimit = (raw: string | null): number => {
  const parsed = Number(raw ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }

  return Math.min(Math.floor(parsed), 300);
};

const resolveAuthStatus = (message: string) => {
  const lowered = message.toLowerCase();
  if (lowered.includes("unauthorized")) return 401;
  if (lowered.includes("forbidden") || lowered.includes("access denied")) {
    return 403;
  }
  if (lowered.includes("not found")) return 404;
  if (lowered.includes("invalid") || lowered.includes("missing")) return 400;
  if (lowered.includes("already completed") || lowered.includes("rejected")) {
    return 409;
  }
  return 500;
};

const toUserStatus = (status: ShamCashManualWithdrawalStatus) => {
  if (status === "COMPLETED") return "COMPLETED" as const;
  if (status === "REJECTED") return "FAILED" as const;
  if (status === "VERIFYING") return "PROCESSING" as const;
  return "PENDING" as const;
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    await requireAdminUser();

    const statusParam = String(req.nextUrl.searchParams.get("status") || "ALL")
      .trim()
      .toUpperCase() as StatusFilter;

    if (!VALID_STATUSES.includes(statusParam)) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Invalid status filter", isArabic),
        },
        { status: 400 },
      );
    }

    const limit = parseLimit(req.nextUrl.searchParams.get("limit"));

    const where =
      statusParam === "ALL"
        ? {}
        : ({ status: statusParam as ShamCashManualWithdrawalStatus } as const);

    const rows = await prisma.shamCashManualWithdrawal.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        walletCode: true,
        qrCode: true,
        note: true,
        failureReason: true,
        transactionId: true,
        verificationRawText: true,
        requestedAt: true,
        updatedAt: true,
        verifiedAt: true,
        completedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        verifiedByAdmin: {
          select: { id: true, name: true, email: true },
        },
        completedByAdmin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const summary = {
      totalRows: rows.length,
      pending: rows.filter((row) => row.status === "PENDING_ADMIN").length,
      verifying: rows.filter((row) => row.status === "VERIFYING").length,
      completed: rows.filter((row) => row.status === "COMPLETED").length,
      rejected: rows.filter((row) => row.status === "REJECTED").length,
    };

    return NextResponse.json(
      {
        filters: {
          status: statusParam,
          limit,
        },
        summary,
        rows: rows.map((row) => ({
          ...row,
          amount: Number(row.amount ?? 0),
          userStatus: toUserStatus(row.status),
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load manual withdrawal requests";
    const statusCode = resolveAuthStatus(message);

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: statusCode },
    );
  }
}

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const admin = await requireAdminUser();

    const body = (await req.json()) as {
      action?: string;
      requestId?: string;
      transactionId?: string;
      failureReason?: string;
      adminNote?: string;
    };

    const action = String(body.action || "")
      .trim()
      .toUpperCase();
    const requestId = String(body.requestId || "").trim();

    if (!requestId) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Missing manual withdrawal request id",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const existing = await prisma.shamCashManualWithdrawal.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        userId: true,
        status: true,
        amount: true,
        currency: true,
        note: true,
        requestedAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Manual withdrawal request not found",
            isArabic,
          ),
        },
        { status: 404 },
      );
    }

    if (existing.status === "COMPLETED") {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Manual withdrawal request already completed",
            isArabic,
          ),
        },
        { status: 409 },
      );
    }

    if (existing.status === "REJECTED") {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Manual withdrawal request already rejected",
            isArabic,
          ),
        },
        { status: 409 },
      );
    }

    const completeRequest = async (input: {
      transactionId?: string;
      verificationRawText?: string;
      verified: boolean;
    }) => {
      const { transactionId, verificationRawText, verified } = input;

      return prisma.$transaction(async (tx) => {
        const request = await tx.shamCashManualWithdrawal.findUnique({
          where: { id: requestId },
          select: {
            id: true,
            status: true,
            userId: true,
            amount: true,
            currency: true,
            note: true,
            user: {
              select: {
                id: true,
                balance: true,
              },
            },
          },
        });

        if (!request) {
          throw new Error("Manual withdrawal request not found");
        }

        if (request.status === "COMPLETED") {
          throw new Error("Manual withdrawal request already completed");
        }

        if (request.status === "REJECTED") {
          throw new Error("Manual withdrawal request already rejected");
        }

        const amountNumber = Number(request.amount ?? 0);
        const currentBalance = Number(request.user.balance ?? 0);

        if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
          throw new Error("Invalid manual withdrawal amount");
        }

        if (currentBalance < amountNumber) {
          throw new Error(
            "Insufficient ready balance to settle this manual withdrawal",
          );
        }

        await tx.user.update({
          where: { id: request.userId },
          data: {
            balance: {
              decrement: amountNumber,
            },
          },
        });

        await tx.chargingLog.create({
          data: {
            userId: request.userId,
            type: "SHAMCASH_MANUAL_WITHDRAWAL",
            amount: -Math.abs(amountNumber),
          },
        });

        await recordPlatformProfitLedgerEntries(tx, [
          {
            type: "USER_WITHDRAWAL_LIABILITY_RELEASE",
            amount: amountNumber,
            userId: request.userId,
            referenceId: request.id,
            note: "Manual ShamCash withdrawal reduced ready user liability",
          },
        ]);

        const updated = await tx.shamCashManualWithdrawal.update({
          where: { id: request.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
            completedByAdminId: admin.id,
            verifiedAt: verified ? new Date() : undefined,
            verifiedByAdminId: verified ? admin.id : undefined,
            transactionId: transactionId || undefined,
            verificationRawText: verificationRawText || undefined,
            failureReason: null,
          },
        });

        await tx.notification.create({
          data: {
            userId: request.userId,
            title: t(
              "✅ تمت العملية بنجاح",
              "✅ Withdrawal completed successfully",
            ),
            message: t(
              `تمت عملية السحب بنجاح بقيمة ${amountNumber.toFixed(2)} ${request.currency}.`,
              `Your withdrawal was completed successfully (${amountNumber.toFixed(2)} ${request.currency}).`,
            ),
          },
        });

        const adminUsers = await tx.user.findMany({
          where: {
            isAdmin: true,
            isDeleted: false,
          },
          select: { id: true },
        });

        if (adminUsers.length) {
          const adminIds = adminUsers.map((row) => row.id);

          await tx.notification.deleteMany({
            where: {
              userId: { in: adminIds },
              OR: [
                { message: { contains: `SCW_REQUEST_ID:${request.id}` } },
                { message: { contains: `Request ID: ${request.id}` } },
                { message: { contains: `رقم الطلب: ${request.id}` } },
              ],
            },
          });
        }

        return updated;
      });
    };

    if (action === "VERIFY_AND_COMPLETE") {
      await prisma.shamCashManualWithdrawal.update({
        where: { id: requestId },
        data: {
          status: "VERIFYING",
          verifiedByAdminId: admin.id,
          failureReason: null,
        },
      });

      const providedTransactionId = String(body.transactionId || "").trim();
      const verifyResult = await verifyShamCashOutgoingTransferInHistory({
        amount: Number(existing.amount ?? 0),
        requestedAt: existing.requestedAt,
        expectedTransactionId: providedTransactionId,
      });

      if (!verifyResult) {
        await prisma.shamCashManualWithdrawal.update({
          where: { id: requestId },
          data: {
            status: "PENDING_ADMIN",
            failureReason: t(
              "تعذر التحقق من سجل شام كاش. يمكنك المحاولة لاحقاً أو الإتمام اليدوي.",
              "Could not verify transfer in ShamCash history. Retry later or complete manually.",
            ),
          },
        });

        return NextResponse.json(
          {
            success: false,
            message: t(
              "لم يتم العثور على تحويل مؤكد في سجل شام كاش",
              "No confirmed transfer found in ShamCash history",
            ),
          },
          { status: 409 },
        );
      }

      const completed = await completeRequest({
        verified: true,
        transactionId: verifyResult.transactionId || providedTransactionId,
        verificationRawText: verifyResult.rawText,
      });

      return NextResponse.json(
        {
          success: true,
          action,
          request: {
            id: completed.id,
            status: completed.status,
            transactionId: completed.transactionId,
            completedAt: completed.completedAt,
          },
          message: t(
            "تم التحقق من التحويل وإتمام الطلب بنجاح",
            "Transfer verified and request completed successfully",
          ),
        },
        { status: 200 },
      );
    }

    if (action === "COMPLETE_MANUAL") {
      const providedTransactionId = String(body.transactionId || "").trim();
      const adminNote = String(body.adminNote || "").trim();

      const completed = await completeRequest({
        verified: false,
        transactionId: providedTransactionId,
        verificationRawText: adminNote || "Manual admin confirmation",
      });

      return NextResponse.json(
        {
          success: true,
          action,
          request: {
            id: completed.id,
            status: completed.status,
            transactionId: completed.transactionId,
            completedAt: completed.completedAt,
          },
          message: t(
            "تم إتمام الطلب يدوياً بنجاح",
            "Manual completion confirmed successfully",
          ),
        },
        { status: 200 },
      );
    }

    if (action === "REJECT") {
      const failureReason = String(body.failureReason || "").trim();

      const rejected = await prisma.$transaction(async (tx) => {
        const updated = await tx.shamCashManualWithdrawal.update({
          where: { id: requestId },
          data: {
            status: "REJECTED",
            failureReason:
              failureReason ||
              t(
                "تم رفض الطلب اليدوي من قبل الإدارة",
                "Manual withdrawal request was rejected by admin",
              ),
            completedByAdminId: admin.id,
          },
        });

        await tx.notification.create({
          data: {
            userId: existing.userId,
            title: t(
              "⚠️ تعذر إتمام طلب السحب",
              "⚠️ Withdrawal request could not be completed",
            ),
            message:
              failureReason ||
              t(
                "تعذر إتمام طلب السحب. يرجى التواصل مع الدعم للمزيد من التفاصيل.",
                "Your withdrawal request could not be completed. Please contact support for more details.",
              ),
          },
        });

        return updated;
      });

      return NextResponse.json(
        {
          success: true,
          action,
          request: {
            id: rejected.id,
            status: rejected.status,
            updatedAt: rejected.updatedAt,
          },
          message: t("تم رفض الطلب", "Request rejected"),
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        message: localizeErrorMessage("Invalid action", isArabic),
      },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to process manual withdrawal action";
    const statusCode = resolveAuthStatus(message);

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: statusCode },
    );
  }
}
