// src/server/chat/messageStatus.ts
// Backed by PostgreSQL via Prisma — no Firestore reads or writes.
import { prisma } from "@/lib/prisma";

const asUniqueIds = (ids: string[]) =>
  Array.from(
    new Set(
      ids
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
        .slice(0, 200),
    ),
  );

export const markMessagesDelivered = async ({
  conversationId,
  senderId,
  recipientId,
  messageIds,
}: {
  conversationId: string;
  senderId: string;
  recipientId: string;
  messageIds: string[];
}) => {
  const uniqueIds = asUniqueIds(messageIds);
  if (uniqueIds.length === 0) return { updatedMessageIds: [] as string[] };

  const now = new Date();

  // Find eligible messages (not yet seen, correct participants).
  const eligible = await prisma.chatMessage.findMany({
    where: {
      id: { in: uniqueIds },
      conversationId,
      senderId,
      recipientId,
      status: { not: "SEEN" },
    },
    select: { id: true },
  });

  const eligibleIds = eligible.map((m) => m.id);
  if (eligibleIds.length === 0) return { updatedMessageIds: [] as string[] };

  await prisma.chatMessage.updateMany({
    where: { id: { in: eligibleIds } },
    data: { status: "DELIVERED", deliveredAt: now },
  });

  return { updatedMessageIds: eligibleIds };
};

export const markConversationMessagesSeen = async ({
  conversationId,
  readerUserId,
  senderId,
  messageIds,
}: {
  conversationId: string;
  readerUserId: string;
  senderId?: string;
  messageIds?: string[];
}) => {
  // Authorization check.
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    select: { participantIds: true },
  });

  if (!conversation?.participantIds.includes(readerUserId)) {
    return { updatedMessageIds: [] as string[], readCount: 0 };
  }

  const now = new Date();
  const uniqueIds = messageIds ? asUniqueIds(messageIds) : null;

  // Build where clause.
  const where = {
    conversationId,
    recipientId: readerUserId,
    status: { not: "SEEN" as const },
    ...(senderId ? { senderId } : {}),
    ...(uniqueIds && uniqueIds.length > 0 ? { id: { in: uniqueIds } } : {}),
  };

  const eligible = await prisma.chatMessage.findMany({
    where,
    select: { id: true },
  });

  const eligibleIds = eligible.map((m) => m.id);
  if (eligibleIds.length === 0) {
    return { updatedMessageIds: [] as string[], readCount: 0 };
  }

  await prisma.chatMessage.updateMany({
    where: { id: { in: eligibleIds } },
    data: { status: "SEEN", seenAt: now, isRead: true },
  });

  // Reset unread count.
  await prisma.chatUnread.upsert({
    where: {
      conversationId_userId: { conversationId, userId: readerUserId },
    },
    create: { conversationId, userId: readerUserId, count: 0 },
    update: { count: 0 },
  });

  return { updatedMessageIds: eligibleIds, readCount: eligibleIds.length };
};
