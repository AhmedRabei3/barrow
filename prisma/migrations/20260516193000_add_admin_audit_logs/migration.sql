-- Create admin audit log table for sensitive admin operations tracking
CREATE TABLE "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "actorAdminId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_actorAdminId_createdAt_idx"
ON "AdminAuditLog" ("actorAdminId", "createdAt");

CREATE INDEX "AdminAuditLog_targetUserId_createdAt_idx"
ON "AdminAuditLog" ("targetUserId", "createdAt");

CREATE INDEX "AdminAuditLog_action_createdAt_idx"
ON "AdminAuditLog" ("action", "createdAt");

CREATE INDEX "AdminAuditLog_entityType_entityId_idx"
ON "AdminAuditLog" ("entityType", "entityId");

ALTER TABLE "AdminAuditLog"
ADD CONSTRAINT "AdminAuditLog_actorAdminId_fkey"
FOREIGN KEY ("actorAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminAuditLog"
ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
