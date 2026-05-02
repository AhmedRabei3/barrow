// src/app/api/chat/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  adminFirestore,
  firebaseAdminSetupHint,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";
import { logger } from "@/lib/logger";
import type { Timestamp } from "firebase-admin/firestore";

const PAGE_SIZE = 20;

const isFirestoreNotFoundError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: number | string;
    message?: string;
    details?: string;
  };

  return (
    candidate.code === 5 ||
    candidate.code === "5" ||
    candidate.code === "NOT_FOUND" ||
    candidate.message?.includes("NOT_FOUND") ||
    candidate.details?.includes("NOT_FOUND")
  );
};

type ConversationDoc = {
  participants?: string[];
  participantNames?: Record<string, string>;
  unreadBy?: Record<string, number>;
  listingId?: string;
  listingTitle?: string;
  itemType?: string;
  lastMessage?: string;
  lastMessageAt?: Timestamp | string; // ✅ دعم النوعين
  lastMessageSenderId?: string;
};

// ✅ helper موحد لتحويل التاريخ
const normalizeDate = (value?: Timestamp | string | null): Date | null => {
  if (!value) return null;

  // إذا كان Timestamp
  if (typeof value === "object" && "toDate" in value) {
    try {
      return (value as Timestamp).toDate();
    } catch {
      return null;
    }
  }

  // إذا كان string
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { message: firebaseAdminSetupHint },
      { status: 503 }
    );
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const cursor = req.nextUrl.searchParams.get("cursor");

    let query = adminFirestore
      .collection("conversations")
      .where("participants", "array-contains", userId)
      .orderBy("lastMessageAt", "desc")
      .limit(PAGE_SIZE);

    if (cursor) {
      const cursorDate = new Date(cursor);
      query = query.startAfter(cursorDate);
    }

    const snapshot = await query.get();

    const conversations = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as ConversationDoc;

      const participants = data.participants ?? [];
      const otherParticipantId =
        participants.find((id) => id !== userId) ?? "";

      const otherParticipantName =
        data.participantNames?.[otherParticipantId] ?? "User";

      const lastMessageDate = normalizeDate(data.lastMessageAt);

      return {
        id: docSnap.id,
        listingId: data.listingId ?? "",
        listingTitle: data.listingTitle ?? "",
        itemType: data.itemType ?? "",
        lastMessage: data.lastMessage ?? "",
        lastMessageAt: lastMessageDate
          ? lastMessageDate.toISOString()
          : null,
        lastMessageSenderId: data.lastMessageSenderId ?? null,
        otherParticipantId,
        otherParticipantName,
        unreadCount: Number(data.unreadBy?.[userId] ?? 0),
      };
    });

    // ✅ cursor آمن
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const lastDocData = lastDoc?.data() as ConversationDoc | undefined;

    const nextDate = normalizeDate(lastDocData?.lastMessageAt);

    const nextCursor = nextDate ? nextDate.toISOString() : null;

    return NextResponse.json({
      conversations,
      nextCursor,
      hasMore: snapshot.size === PAGE_SIZE,
    });
  } catch (error) {
    if (isFirestoreNotFoundError(error)) {
      logger.warn(
        "Firestore returned NOT_FOUND while listing conversations.",
        error
      );
      return NextResponse.json({
        conversations: [],
        nextCursor: null,
        hasMore: false,
      });
    }

    logger.error("Failed to list conversations", error);

    return NextResponse.json(
      { message: "Failed to load conversations" },
      { status: 500 }
    );
  }
}