import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

type TicketListItem = {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  lastSenderRole: "USER" | "ADMIN";
};

export async function GET(req: NextRequest) {
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

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            body: true,
            senderRole: true,
          },
        },
      },
    });

    const items: TicketListItem[] = tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      lastMessage: ticket.messages[0]?.body || "",
      lastSenderRole: (ticket.messages[0]?.senderRole || "USER") as
        | "USER"
        | "ADMIN",
    }));

    const openCount = items.filter((ticket) => ticket.status === "OPEN").length;

    return NextResponse.json({ tickets: items, openCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load support tickets";
    return NextResponse.json(
      { message: localizeErrorMessage(message, isArabic) },
      { status: 500 },
    );
  }
}
