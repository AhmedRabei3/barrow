import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rateLimit";
import { NotificationType, SupportSenderRole } from "@prisma/client";
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
      key: "support:contact:post",
      userId: session.user.id,
      limit: 8,
      windowMs: 60_000,
      errorMessage: t(
        "عدد كبير من محاولات الإرسال، يرجى المحاولة بعد قليل",
        "Too many support requests. Please try again shortly.",
      ),
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { subject, message } = (await req.json()) as {
      subject?: string;
      message?: string;
    };

    const normalizedSubject = String(subject || "").trim();
    const normalizedMessage = String(message || "").trim();

    if (!normalizedSubject) {
      return NextResponse.json(
        { message: localizeErrorMessage("Subject is required", isArabic) },
        { status: 400 },
      );
    }

    if (!normalizedMessage) {
      return NextResponse.json(
        { message: localizeErrorMessage("Message is required", isArabic) },
        { status: 400 },
      );
    }

    if (normalizedSubject.length > 120) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Subject exceeds maximum length",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    if (normalizedMessage.length > 2000) {
      return NextResponse.json(
        {
          message: localizeErrorMessage(
            "Message exceeds maximum length",
            isArabic,
          ),
        },
        { status: 400 },
      );
    }

    const [sender, admins] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true },
      }),
      prisma.user.findMany({
        where: { isAdmin: true, isDeleted: false },
        select: { id: true },
      }),
    ]);

    if (!sender) {
      return NextResponse.json(
        { message: localizeErrorMessage("User not found", isArabic) },
        { status: 404 },
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: sender.id,
        subject: normalizedSubject,
        messages: {
          create: {
            senderId: sender.id,
            senderRole: SupportSenderRole.USER,
            body: normalizedMessage,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (admins.length > 0) {
      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              title: `📩 ${t("رسالة دعم جديدة", "New support ticket")}`,
              message: `${t("من", "From")}: ${sender.name || "-"} (${sender.email})\n${t("العنوان", "Subject")}: ${normalizedSubject}\n${t("رقم التذكرة", "Ticket ID")}: ${ticket.id}`,
              type: NotificationType.INFO,
            },
          }),
        ),
      );
    }

    return NextResponse.json({
      success: true,
      message: t(
        "تم استلام رسالتك وسيتم الرد عليك قريباً",
        "Your message has been received. We will reply soon.",
      ),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send support message";

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: 500 },
    );
  }
}
