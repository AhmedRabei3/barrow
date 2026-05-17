import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { assertAdminCapability } from "@/app/api/utils/adminCapabilities";

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  assertAdminCapability(
    admin,
    "USER_MANAGEMENT",
    "You do not have permission to send admin notifications",
  );
  const { userId, title, message, type } = await req.json();
  if (!userId || !title || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: type || "INFO",
    },
  });
  return NextResponse.json({ ok: true });
}
