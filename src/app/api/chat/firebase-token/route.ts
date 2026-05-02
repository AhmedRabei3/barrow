import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  adminAuth,
  firebaseAdminSetupHint,
  isFirebaseAdminConfigured,
} from "@/server/firebase/admin";

export async function GET() {
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

    const token = await adminAuth.createCustomToken(session.user.id);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Failed to create Firebase custom token", error);
    return NextResponse.json(
      { message: "Failed to create auth token" },
      { status: 500 },
    );
  }
}
