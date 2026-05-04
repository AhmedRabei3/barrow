// src/app/api/chat/messages/read/route.ts
// Backed by PostgreSQL via Prisma — no Firestore reads or writes.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { publishMessageSeenEvent } from "@/lib/websocketServer";
import { logger } from "@/lib/logger";

const markReadSchema = z.object({
  conversationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = markReadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const userId = session.user.id;
    const { conversationId } = parsed.data;

    // Authorization.
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { participantIds: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 },
      );
    }

    if (!conversation.participantIds.includes(userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const senderId = conversation.participantIds.find((id) => id !== userId);
    const now = new Date();

    // Mark all incoming unread messages as seen.
    const updatedMessages = await prisma.chatMessage.findMany({
      where: {
        conversationId,
        recipientId: userId,
        status: { not: "SEEN" },
      },
      select: { id: true },
    });

    const updatedMessageIds = updatedMessages.map((m) => m.id);

    if (updatedMessageIds.length > 0) {
      await prisma.chatMessage.updateMany({
        where: { id: { in: updatedMessageIds } },
        data: { status: "SEEN", seenAt: now, isRead: true },
      });
    }

    // Reset unread count.
    await prisma.chatUnread.upsert({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      create: { conversationId, userId, count: 0 },
      update: { count: 0 },
    });

    // Notify sender via WebSocket.
    if (senderId && updatedMessageIds.length > 0) {
      await publishMessageSeenEvent({
        conversationId,
        messageIds: updatedMessageIds,
        seenBy: userId,
        targetUserIds: [senderId, userId],
      });
    }

    // Tell the client to refresh the unread badge.
    return NextResponse.json({
      success: true,
      readCount: updatedMessageIds.length,
      conversationId,
      messageIds: updatedMessageIds,
    });
  } catch (error) {
    logger.error("Failed to mark chat messages as read", error);
    return NextResponse.json(
      { message: "Failed to mark messages as read" },
      { status: 500 },
    );
  }
}
