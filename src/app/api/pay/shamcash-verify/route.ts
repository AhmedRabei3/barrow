import { NotificationType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import {
  getRequiredShamCashActivationAmount,
  isValidShamCashTransactionNumber,
  normalizeShamCashTransactionNumber,
} from "@/lib/shamcashActivationWorker";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const user = await authHelper();
    const body = (await req.json()) as { txNumber?: string };
    const txNumber = normalizeShamCashTransactionNumber(body?.txNumber || "");

    if (!isValidShamCashTransactionNumber(body?.txNumber || "")) {
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "رقم العملية يجب أن يبدأ بالرمز # مثل #123456",
            "Transaction number must start with # like #123456",
          ),
        },
        { status: 400 },
      );
    }

    const requiredAmount = await getRequiredShamCashActivationAmount();

    const existing = await prisma.shamCashActivationRequest.findFirst({
      where: { txNumber },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: t("رقم عملية مستخدم", "Transaction number already used"),
          message: t(
            "رقم العملية الذي أدخلته مستخدم سابقاً. يرجى التأكد من الرقم والمحاولة مجدداً.",
            "The transaction number you entered has already been used. Please check it and try again.",
          ),
          type: "WARNING",
        },
      });

      return NextResponse.json(
        {
          ok: false,
          message: t(
            "تم استخدام هذا الرقم مسبقاً",
            "This transaction number has already been used",
          ),
        },
        { status: 409 },
      );
    }

    const activationRequest = await prisma.shamCashActivationRequest.create({
      data: {
        userId: user.id,
        txNumber,
        amount: requiredAmount,
        status: "ADMIN_REVIEW",
        checkedByWorker: true,
        adminNote: t(
          "طلبك قيد المراجعة ،سنعلمك بالنتيجة قريباً ، شكراً لصبركم",
          "Your request is under review. You will be notified of the result soon. Thank you for your patience.",
        ),
      },
    });

    const admins = await prisma.user.findMany({
      where: {
        isAdmin: true,
        isDeleted: false,
      },
      select: {
        id: true,
      },
    });

    const displayName = user.name?.trim() || user.email?.trim() || user.id;
    const adminMessage = [
      t(
        `طلب تفعيل شام كاش جديد من ${displayName} يحتاج مراجعة يدوية.`,
        `A new ShamCash activation request from ${displayName} needs manual review.`,
      ),
      `${t("رقم العملية", "Transaction")}: ${txNumber}`,
      `SCA_REQUEST_ID:${activationRequest.id}`,
    ].join("\n");

    await Promise.all(
      admins.map((admin) =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: t(
              "🚨 طلب تفعيل ShamCash جديد",
              "🚨 New ShamCash activation request",
            ),
            message: adminMessage,
            type: NotificationType.INFO,
          },
        }),
      ),
    );

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: t("تم استلام طلبك", "Your request was received"),
        message: t(
          "تم إرسال طلبك إلى المدير للمراجعة. سيصلك إشعار عند القبول أو الرفض.",
          "Your request was sent to the admin team for review. You will receive a notification once it is approved or rejected.",
        ),
        type: "INFO",
      },
    });

    return NextResponse.json({
      ok: true,
      pending: true,
      message: t(
        "طلبك قيد المراجعة , سيتم إرسال إشعار بالنتيجة قريباً ، شكراً لصبركم",
        "Your request is under review, you will receive a notification with the result soon. Thank you for your patience.",
      ),
    });
  } catch (error) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : "Failed to submit ShamCash request";

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: t(
            "تم استخدام رقم العملية هذا مسبقاً",
            "This transaction number has already been used",
          ),
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        message: localizeErrorMessage(rawMessage, isArabic),
      },
      { status: 500 },
    );
  }
}
