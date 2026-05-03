// src/app/api/chat/unread-count/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  adminFirestore,
  firebaseAdminSetupHint,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";
import { logger } from "@/lib/logger";

export async function GET() {
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

    const userDoc = await adminFirestore
      .collection("users")
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const data = userDoc.data() as { unreadCount?: number };

    return NextResponse.json({
      unreadCount: Math.max(0, Number(data?.unreadCount ?? 0)),
    });
  } catch (error) {
    logger.error("Failed to load unread count", error);

    return NextResponse.json(
      { message: "Failed to load unread count" },
      { status: 500 }
    );
  }
}
