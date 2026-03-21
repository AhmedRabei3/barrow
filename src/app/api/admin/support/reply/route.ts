import { NextRequest, NextResponse } from "next/server";
import { NotificationType, SupportSenderRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAbminUser } from "@/app/api/utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

export async function POST(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const admin = await requireAbminUser();

    const { ticketId, recipientUserId, subject, message } =
      (await req.json()) as {
        ticketId?: string;
        recipientUserId?: string;
        subject?: string;
        message?: string;
      };

    const normalizedSubject = String(subject || "").trim();
    const normalizedMessage = String(message || "").trim();

    if (!ticketId) {
      return NextResponse.json(
        { message: localizeErrorMessage("ticketId is required", isArabic) },
        { status: 400 },
      );
    }

    if (!recipientUserId) {
      return NextResponse.json(
        { message: localizeErrorMessage("User ID is required", isArabic) },
        { status: 400 },
      );
    }

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

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!ticket || ticket.userId !== recipientUserId) {
      return NextResponse.json(
        { message: localizeErrorMessage("Support ticket not found", isArabic) },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: admin.id,
          senderRole: SupportSenderRole.ADMIN,
          body: normalizedMessage,
        },
      });

      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "CLOSED" },
      });

      await tx.notification.create({
        data: {
          userId: recipientUserId,
          title: `📬 ${t("رد من خدمة العملاء", "Reply from customer service")}: ${normalizedSubject}`,
          message: normalizedMessage,
          type: NotificationType.INFO,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: t("تم إرسال الرد بنجاح", "Reply sent successfully"),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send support reply";

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: 401 },
    );
  }
}
