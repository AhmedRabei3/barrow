import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationType, SupportSenderRole } from "@prisma/client";
import { enforceRateLimit } from "@/lib/rateLimit";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

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

    const rateLimitResponse = await enforceRateLimit({
      req,
      key: "support:activation-code-request:post",
      userId: session.user.id,
      limit: 5,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من المحاولات، يرجى المحاولة بعد قليل",
        "Too many requests. Please try again shortly.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { contactEmail, note } = (await req.json()) as {
      contactEmail?: string;
      note?: string;
    };

    const email = String(contactEmail || session.user.email || "").trim();
    const extraNote = String(note || "").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          message: localizeErrorMessage("Invalid email format", isArabic),
        },
        { status: 400 },
      );
    }

    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });

    if (!sender) {
      return NextResponse.json(
        { message: localizeErrorMessage("User not found", isArabic) },
        { status: 404 },
      );
    }

    const body = [
      t(
        "طلب شراء كود تفعيل عبر شام كاش.",
        "Request to buy activation code via ShamCash.",
      ),
      `${t("اسم المستخدم", "User")}: ${sender.name}`,
      `${t("بريد الحساب", "Account email")}: ${sender.email}`,
      `${t("بريد التواصل", "Contact email")}: ${email}`,
      extraNote
        ? `${t("ملاحظة إضافية", "Additional note")}: ${extraNote}`
        : null,
      t(
        "يرجى التواصل لإتمام الدفع ثم إرسال كود/رابط التفعيل إلى البريد أعلاه.",
        "Please contact the user to complete payment, then send activation code/link to the email above.",
      ),
    ]
      .filter(Boolean)
      .join("\n");

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: sender.id,
        subject: "[ACTIVATION_CODE_REQUEST] طلب كود تفعيل عبر شام كاش",
        messages: {
          create: {
            senderId: sender.id,
            senderRole: SupportSenderRole.USER,
            body,
          },
        },
      },
      select: { id: true },
    });

    const admins = await prisma.user.findMany({
      where: { isAdmin: true, isDeleted: false },
      select: { id: true },
    });

    if (admins.length > 0) {
      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              title: `📩 ${t("طلب كود تفعيل", "Activation code request")}`,
              message: `${t("رقم التذكرة", "Ticket ID")}: ${ticket.id}\n${t("المستخدم", "User")}: ${sender.name} (${sender.email})`,
              type: NotificationType.INFO,
            },
          }),
        ),
      );
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: t(
        "تم إرسال طلب شراء كود التفعيل إلى مركز المساعدة",
        "Activation code purchase request sent to support center",
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create activation code support request";
    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
