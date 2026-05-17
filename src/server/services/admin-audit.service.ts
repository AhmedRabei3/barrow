import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AdminAuditInput = {
  actorAdminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  targetUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const extractClientIp = (request: Request): string | null => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return request.headers.get("x-real-ip");
};

export async function recordAdminAudit(input: AdminAuditInput): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      actorAdminId: input.actorAdminId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      targetUserId: input.targetUserId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata:
        input.metadata === null
          ? Prisma.JsonNull
          : (input.metadata as Prisma.InputJsonValue | undefined),
    },
  });
}
