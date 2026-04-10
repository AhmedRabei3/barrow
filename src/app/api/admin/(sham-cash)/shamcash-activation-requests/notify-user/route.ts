import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";

export async function POST(req: NextRequest) {
  await requireAdminUser();
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
