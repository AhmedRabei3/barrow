import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { publishMessageSeenEvent } from "@/lib/websocketServer";
import { logger } from "@/lib/logger";
import {
  adminFirestore,
  firebaseAdminSetupHint,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";
import { markConversationMessagesSeen } from "@/server/chat/messageStatus";

const markReadSchema = z.object({
  conversationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { message: firebaseAdminSetupHint },
      { status: 503 },
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
        { status: 400 },
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
        { status: 404 },
      );
    }

    const conversationData = conversationSnap.data() as
      | { participants?: string[] }
      | undefined;

    if (!conversationData?.participants?.includes(userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const senderId = (conversationData.participants ?? []).find(
      (participantId) => participantId !== userId,
    );

    const updateResult = await markConversationMessagesSeen({
      conversationId,
      readerUserId: userId,
      senderId,
    });

    if (senderId && updateResult.updatedMessageIds.length > 0) {
      await publishMessageSeenEvent({
        conversationId,
        messageIds: updateResult.updatedMessageIds,
        seenBy: userId,
        targetUserIds: [senderId, userId],
      });
    }

    return NextResponse.json({
      success: true,
      readCount: updateResult.readCount,
      conversationId,
      messageIds: updateResult.updatedMessageIds,
    });
  } catch (error) {
    logger.error("Failed to mark chat messages as read", error);
    return NextResponse.json(
      { message: "Failed to mark messages as read" },
      { status: 500 },
    );
  }
}
