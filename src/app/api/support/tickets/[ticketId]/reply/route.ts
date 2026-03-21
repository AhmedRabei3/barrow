import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SupportSenderRole } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
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

    const { ticketId } = await context.params;
    const { message } = (await req.json()) as { message?: string };
    const normalizedMessage = String(message || "").trim();

    if (!normalizedMessage) {
      return NextResponse.json(
        { message: localizeErrorMessage("Message is required", isArabic) },
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

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { message: localizeErrorMessage("Support ticket not found", isArabic) },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderId: session.user.id,
          senderRole: SupportSenderRole.USER,
          body: normalizedMessage,
        },
      });

      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "OPEN" },
      });
    });

    return NextResponse.json({
      success: true,
      message: t("تم إرسال رسالتك", "Your message has been sent"),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send ticket reply";
    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
