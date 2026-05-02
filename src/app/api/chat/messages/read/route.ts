// src/app/api/chat/messages/read/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import {
  adminFirestore,
  firebaseAdminSetupHint,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";
import { logger } from "@/lib/logger";

const markReadSchema = z.object({
  conversationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
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

    const parsed = markReadSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const { conversationId } = parsed.data;

    const conversationRef = adminFirestore
      .collection("conversations")
      .doc(conversationId);

    const conversationSnap = await conversationRef.get();

    if (!conversationSnap.exists) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    const conversationData = conversationSnap.data() as
      | { participants?: string[] }
      | undefined;

    if (!conversationData?.participants?.includes(userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // 🔥 جلب الرسائل غير المقروءة
    const unreadMessagesSnap = await conversationRef
      .collection("messages")
      .where("recipientId", "==", userId)
      .where("isRead", "==", false)
      .get();

    const batch = adminFirestore.batch();
    const nowIso = new Date().toISOString();

    // 🔥 تحديث الرسائل إلى مقروءة
    unreadMessagesSnap.docs.forEach((messageDoc) => {
      batch.update(messageDoc.ref, {
        isRead: true,
        readAt: nowIso,
      });
    });

    // 🔥 تحديث conversation unreadBy
    batch.set(
      conversationRef,
      {
        [`unreadBy.${userId}`]: 0,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 🔥 NEW: تحديث unreadCount العام (user level)
    const userRef = adminFirestore.collection("users").doc(userId);

    batch.set(
      userRef,
      {
        unreadCount: 0,
        lastUpdated: nowIso,
      },
      { merge: true }
    );

    await batch.commit();

    return NextResponse.json({
      success: true,
      readCount: unreadMessagesSnap.size,
      conversationId,
    });
  } catch (error) {
    logger.error("Failed to mark chat messages as read", error);

    return NextResponse.json(
      { message: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}