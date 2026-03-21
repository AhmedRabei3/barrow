import { NextRequest, NextResponse } from "next/server";
import { NotificationType, SupportSenderRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAbminUser } from "@/app/api/utils/authHelper";
import { sendMail } from "@/lib/mailer";
import { resolveIsArabicFromRequest } from "@/app/i18n/errorMessages";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const admin = await requireAbminUser();

    const { recipientUserId, ticketId, balance } = (await req.json()) as {
      recipientUserId?: string;
      ticketId?: string;
      balance?: number;
    };

    const codeBalance = Number(balance ?? 30);
    if (!recipientUserId) {
      return NextResponse.json(
        { message: t("معرّف المستخدم مطلوب", "User ID is required") },
        { status: 400 },
      );
    }

    if (!Number.isFinite(codeBalance) || codeBalance <= 0) {
      return NextResponse.json(
        {
          message: t(
            "قيمة كود التفعيل يجب أن تكون أكبر من صفر",
            "Activation code balance must be greater than zero",
          ),
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: recipientUserId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: t("المستخدم غير موجود", "User not found") },
        { status: 404 },
      );
    }

    const activationCode = await prisma.activationCode.create({
      data: { balance: codeBalance },
      select: { id: true, code: true, balance: true },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const activationHelpLink = `${appUrl}/payment`;

    await sendMail({
      to: user.email,
      subject: t("كود تفعيل حسابك", "Your account activation code"),
      text: t(
        `مرحباً ${user.name}،\n\nتم إصدار كود تفعيل لحسابك:\n${activationCode.code}\n\nقيمة الكود: ${Number(activationCode.balance).toFixed(2)}\n\nاستخدم الكود داخل نافذة التفعيل في المنصة.\n\nرابط مفيد: ${activationHelpLink}`,
        `Hello ${user.name},\n\nYour activation code is:\n${activationCode.code}\n\nCode value: ${Number(activationCode.balance).toFixed(2)}\n\nPlease paste this code in the activation modal in the platform.\n\nHelpful link: ${activationHelpLink}`,
      ),
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.7; direction:${isArabic ? "rtl" : "ltr"}; text-align:${isArabic ? "right" : "left"};">
          <h2>${t("كود تفعيل الحساب", "Account activation code")}</h2>
          <p>${t("مرحباً", "Hello")} ${user.name}</p>
          <p>${t("تم إصدار كود التفعيل الخاص بك:", "Your activation code is:")}</p>
          <p style="font-size:18px;font-weight:bold;letter-spacing:1px;">${activationCode.code}</p>
          <p>${t("قيمة الكود", "Code value")}: ${Number(activationCode.balance).toFixed(2)}</p>
          <p>${t("يمكنك إدخاله مباشرة في نافذة التفعيل داخل المنصة.", "You can paste it directly in the activation modal inside the platform.")}</p>
          <p><a href="${activationHelpLink}">${t("رابط المنصة", "Platform link")}</a></p>
        </div>
      `,
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: t("📧 تم إرسال كود التفعيل", "📧 Activation code sent"),
        message: t(
          "تم إرسال كود التفعيل إلى بريدك الإلكتروني. تحقق من صندوق الوارد.",
          "Activation code has been sent to your email. Please check your inbox.",
        ),
        type: NotificationType.INFO,
      },
    });

    if (ticketId) {
      await prisma.$transaction(async (tx) => {
        await tx.supportTicketMessage.create({
          data: {
            ticketId,
            senderId: admin.id,
            senderRole: SupportSenderRole.ADMIN,
            body: t(
              "تم إرسال كود التفعيل إلى بريدك الإلكتروني بنجاح. يرجى التحقق من صندوق البريد ثم إدخال الكود في خانة التفعيل.",
              "Activation code has been sent to your email successfully. Please check your inbox and paste the code in activation input.",
            ),
          },
        });

        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { status: "CLOSED" },
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: t(
        "تم إنشاء كود التفعيل وإرساله بالبريد الإلكتروني",
        "Activation code generated and sent by email",
      ),
      codeId: activationCode.id,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate and send activation code";
    return NextResponse.json({ message }, { status: 500 });
  }
}
