-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'PURCHASEREQUEST');

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "type" "NotificationType";

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
