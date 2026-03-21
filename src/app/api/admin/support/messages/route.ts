import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAbminUser } from "@/app/api/utils/authHelper";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

type SupportMessageDto = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);

  try {
    await requireAbminUser();

    const tickets = await prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          where: { senderRole: "USER" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            body: true,
          },
        },
      },
    });

    const messages: SupportMessageDto[] = tickets.map((ticket) => ({
      id: ticket.id,
      senderUserId: ticket.user.id,
      senderName: ticket.user.name,
      senderEmail: ticket.user.email,
      subject: ticket.subject,
      message:
        ticket.messages[0]?.body || (isArabic ? "لا توجد رسالة" : "No message"),
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load support messages";

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: 401 },
    );
  }
}
