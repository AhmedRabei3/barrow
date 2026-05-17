import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { assertAdminCapability } from "@/app/api/utils/adminCapabilities";
import { prisma } from "@/lib/prisma";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

const parseTake = (raw: string | null): number => {
  const parsed = Number(raw ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 50;
  }

  return Math.min(Math.floor(parsed), 200);
};

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  try {
    const admin = await requireAdminUser();
    assertAdminCapability(
      admin,
      "USER_MANAGEMENT",
      t(
        "لا تملك صلاحية عرض سجل التدقيق",
        "You do not have permission to view audit logs",
      ),
    );

    const take = parseTake(req.nextUrl.searchParams.get("take"));
    const action = String(req.nextUrl.searchParams.get("action") || "").trim();
    const actorAdminId = String(
      req.nextUrl.searchParams.get("actorAdminId") || "",
    ).trim();
    const targetUserId = String(
      req.nextUrl.searchParams.get("targetUserId") || "",
    ).trim();

    const rows = await prisma.adminAuditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(actorAdminId ? { actorAdminId } : {}),
        ...(targetUserId ? { targetUserId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        ipAddress: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
        actorAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        filters: {
          take,
          action,
          actorAdminId,
          targetUserId,
        },
        rows,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load admin audit logs";

    return NextResponse.json(
      {
        message: localizeErrorMessage(message, isArabic),
      },
      { status: 500 },
    );
  }
}
