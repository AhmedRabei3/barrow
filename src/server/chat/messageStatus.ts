import {
  FieldPath,
  FieldValue,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import {
  adminFirestore,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";

type FirestoreChatMessage = {
  senderId?: string;
  recipientId?: string;
  isRead?: boolean;
  status?: string;
  deliveredAt?: string;
  seenAt?: string;
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const asUniqueIds = (ids: string[]) =>
  Array.from(
    new Set(
      ids
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
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
  if (!isFirebaseAdminConfigured) {
    return { updatedMessageIds: [] as string[] };
  }

  const uniqueIds = asUniqueIds(messageIds);
  if (uniqueIds.length === 0) {
    return { updatedMessageIds: [] as string[] };
  }

  const nowIso = new Date().toISOString();
  const conversationRef = adminFirestore
    .collection("conversations")
    .doc(conversationId);
  const messagesRef = conversationRef.collection("messages");
  const updatedMessageIds: string[] = [];

  for (const idChunk of chunk(uniqueIds, 30)) {
    const chunkSnapshot = await messagesRef
      .where(FieldPath.documentId(), "in", idChunk)
      .get();

    if (chunkSnapshot.empty) {
      continue;
    }

    const batch = adminFirestore.batch();
    let hasWrites = false;

    for (const messageDoc of chunkSnapshot.docs) {
      const data = messageDoc.data() as FirestoreChatMessage;

      if (data.senderId !== senderId || data.recipientId !== recipientId) {
        continue;
      }

      if (data.seenAt || data.status === "seen") {
        continue;
      }

      batch.update(messageDoc.ref, {
        status: "delivered",
        deliveredAt: data.deliveredAt ?? nowIso,
        deliveredTo: FieldValue.arrayUnion(recipientId),
      });
      updatedMessageIds.push(messageDoc.id);
      hasWrites = true;
    }

    if (hasWrites) {
      await batch.commit();
    }
  }

  return { updatedMessageIds };
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
  if (!isFirebaseAdminConfigured) {
    return { updatedMessageIds: [] as string[], readCount: 0 };
  }

  const nowIso = new Date().toISOString();
  const conversationRef = adminFirestore
    .collection("conversations")
    .doc(conversationId);
  const conversationSnap = await conversationRef.get();

  if (!conversationSnap.exists) {
    return { updatedMessageIds: [] as string[], readCount: 0 };
  }

  const conversationData = conversationSnap.data() as
    | {
        participants?: string[];
      }
    | undefined;

  if (!conversationData?.participants?.includes(readerUserId)) {
    return { updatedMessageIds: [] as string[], readCount: 0 };
  }

  const messagesRef = conversationRef.collection("messages");
  const updatedMessageIds: string[] = [];
  let readCount = 0;

  const uniqueIds = messageIds ? asUniqueIds(messageIds) : [];

  const applySeenToDocs = async (
    docs: QueryDocumentSnapshot<DocumentData>[],
  ) => {
    if (docs.length === 0) {
      return;
    }

    const batch = adminFirestore.batch();
    let hasWrites = false;

    for (const messageDoc of docs) {
      const data = messageDoc.data() as FirestoreChatMessage;

      if (data.recipientId !== readerUserId) {
        continue;
      }

      if (senderId && data.senderId !== senderId) {
        continue;
      }

      if (data.seenAt || data.isRead || data.status === "seen") {
        continue;
      }

      batch.update(messageDoc.ref, {
        isRead: true,
        readAt: nowIso,
        status: "seen",
        seenAt: nowIso,
        seenBy: FieldValue.arrayUnion(readerUserId),
      });
      updatedMessageIds.push(messageDoc.id);
      readCount += 1;
      hasWrites = true;
    }

    if (hasWrites) {
      await batch.commit();
    }
  };

  if (uniqueIds.length > 0) {
    for (const idChunk of chunk(uniqueIds, 30)) {
      const chunkSnapshot = await messagesRef
        .where(FieldPath.documentId(), "in", idChunk)
        .get();
      await applySeenToDocs(chunkSnapshot.docs);
    }
  } else {
    const unreadSnapshot = await messagesRef
      .where("recipientId", "==", readerUserId)
      .where("isRead", "==", false)
      .limit(500)
      .get();
    await applySeenToDocs(unreadSnapshot.docs);
  }

  const updateBatch = adminFirestore.batch();
  updateBatch.set(
    conversationRef,
    {
      [`unreadBy.${readerUserId}`]: 0,
      updatedAt: nowIso,
    },
    { merge: true },
  );

  if (readCount > 0) {
    const userRef = adminFirestore.collection("users").doc(readerUserId);
    updateBatch.set(
      userRef,
      {
        unreadCount: FieldValue.increment(-readCount),
        lastUpdated: nowIso,
      },
      { merge: true },
    );
  }

  await updateBatch.commit();

  return { updatedMessageIds, readCount };
};
