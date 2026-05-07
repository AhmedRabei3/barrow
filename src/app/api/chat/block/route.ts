// src/app/api/chat/block/route.ts
// إدارة حظر الدردشة: حظر مستخدم / رفع الحظر / التحقق من الحظر
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

const blockSchema = z.object({
  blockedUserId: z.string().trim().min(1),
});

// ── POST /api/chat/block ── حظر مستخدم ──────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = blockSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const blockerId = session.user.id;
    const { blockedUserId } = parsed.data;

    // لا يمكن للمستخدم حظر نفسه
    if (blockerId === blockedUserId) {
      return NextResponse.json(
        { message: "Cannot block yourself" },
        { status: 400 },
      );
    }

    // إنشاء سجل الحظر أو تجاهله إن كان موجوداً بالفعل
    await prisma.chatBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId: blockedUserId } },
      create: { blockerId, blockedId: blockedUserId },
      update: {}, // لا تحديث — التسجيل يكفي
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, req);
  }
}

// ── DELETE /api/chat/block ── رفع الحظر ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = blockSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const blockerId = session.user.id;
    const { blockedUserId } = parsed.data;

    await prisma.chatBlock.deleteMany({
      where: { blockerId, blockedId: blockedUserId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, req);
  }
}

// ── GET /api/chat/block?userId=X ── التحقق من حالة الحظر ────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const targetUserId = req.nextUrl.searchParams.get("userId") ?? "";
    if (!targetUserId) {
      return NextResponse.json(
        { message: "userId is required" },
        { status: 400 },
      );
    }

    const myId = session.user.id;

    // التحقق في الاتجاهين: هل حظرت أنا؟ أو هل هم حظروني؟
    const [iBlockedThem, theyBlockedMe] = await Promise.all([
      prisma.chatBlock.findUnique({
        where: {
          blockerId_blockedId: { blockerId: myId, blockedId: targetUserId },
        },
        select: { id: true },
      }),
      prisma.chatBlock.findUnique({
        where: {
          blockerId_blockedId: { blockerId: targetUserId, blockedId: myId },
        },
        select: { id: true },
      }),
    ]);

    return NextResponse.json({
      iBlockedThem: Boolean(iBlockedThem),
      theyBlockedMe: Boolean(theyBlockedMe),
      isBlocked: Boolean(iBlockedThem || theyBlockedMe),
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
