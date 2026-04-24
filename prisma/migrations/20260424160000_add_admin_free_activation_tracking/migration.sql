ALTER TABLE "User"
ADD COLUMN "freeActivationGrantedAt" TIMESTAMP(3),
ADD COLUMN "freeActivationGrantedByAdminId" TEXT;

CREATE INDEX "User_freeActivationGrantedByAdminId_idx"
ON "User"("freeActivationGrantedByAdminId");

ALTER TABLE "User"
ADD CONSTRAINT "User_freeActivationGrantedByAdminId_fkey"
FOREIGN KEY ("freeActivationGrantedByAdminId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;