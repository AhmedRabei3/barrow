// src/app/api/chat/conversations/route.ts
// Backed by PostgreSQL via Prisma — no Firestore reads.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getUserLastSeen, isUserConnected } from "@/lib/websocketServer";

const PAGE_SIZE = 20;
const RECENT_ACTIVITY_ONLINE_WINDOW_MS = 60_000;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

    // Fetch conversations where the user is a participant, newest first.
    const rawConvs = await prisma.chatConversation.findMany({
      where: { participantIds: { has: userId } },
      orderBy: { lastMessageAt: "desc" },
      take: PAGE_SIZE,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        unreadCounts: {
          where: { userId },
          select: { count: true },
        },
      },
    });

    // Collect unique other-participant IDs for presence lookups.
    const otherIds = Array.from(
      new Set(
        rawConvs
          .map((c) => c.participantIds.find((id) => id !== userId))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    // Presence: WebSocket in-memory / Redis only — zero Firestore reads.
    const [onlineEntries, lastSeenEntries] = await Promise.all([
      Promise.all(
        otherIds.map(async (id) => [id, await isUserConnected(id)] as const),
      ),
      Promise.all(
        otherIds.map(async (id) => [id, await getUserLastSeen(id)] as const),
      ),
    ]);

    const onlineMap = new Map(onlineEntries);
    const lastSeenMap = new Map(lastSeenEntries);

    const conversations = rawConvs.map((c) => {
      const otherParticipantId =
        c.participantIds.find((id) => id !== userId) ?? "";
      const names = c.participantNames as Record<string, string>;
      const otherParticipantName = names[otherParticipantId] ?? "User";
      const unreadCount = c.unreadCounts[0]?.count ?? 0;

      const lastActiveAt = lastSeenMap.get(otherParticipantId);
      const recentlyActive =
        lastActiveAt !== null &&
        lastActiveAt !== undefined &&
        Date.now() - new Date(lastActiveAt).getTime() <=
          RECENT_ACTIVITY_ONLINE_WINDOW_MS;

      return {
        id: c.id,
        listingId: c.listingId,
        listingTitle: c.listingTitle,
        itemType: c.itemType,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
        lastMessageSenderId: c.lastMessageSenderId ?? null,
        otherParticipantId,
        otherParticipantName,
        unreadCount,
        otherParticipantIsOnline:
          Boolean(onlineMap.get(otherParticipantId)) || recentlyActive,
        otherParticipantLastSeenAt:
          lastSeenMap.get(otherParticipantId) ?? null,
      };
    });

    const nextCursor =
      rawConvs.length === PAGE_SIZE
        ? (rawConvs[rawConvs.length - 1]?.id ?? null)
        : null;

    return NextResponse.json({
      conversations,
      nextCursor,
      hasMore: rawConvs.length === PAGE_SIZE,
    });
  } catch (error) {
    logger.error("Failed to list conversations", error);
    return NextResponse.json(
      { message: "Failed to load conversations" },
      { status: 500 },
    );
  }
}
