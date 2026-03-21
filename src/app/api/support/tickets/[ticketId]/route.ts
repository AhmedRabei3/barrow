import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

export async function GET(
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

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId: session.user.id,
      },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            senderRole: true,
            body: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { message: localizeErrorMessage("Support ticket not found", isArabic) },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ticket: {
        ...ticket,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        messages: ticket.messages.map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load support ticket";
    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
