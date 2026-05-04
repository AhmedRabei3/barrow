-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('SENT', 'DELIVERED', 'SEEN');

-- DropIndex
DROP INDEX "ChargingLog_createdAt_idx";

-- DropIndex
DROP INDEX "ChargingLog_type_createdAt_idx";

-- DropIndex
DROP INDEX "ChargingLog_userId_createdAt_idx";

-- DropIndex
DROP INDEX "ItemImage_itemId_itemType_createdAt_idx";

-- DropIndex
DROP INDEX "Notification_userId_isRead_createdAt_idx";

-- DropIndex
DROP INDEX "Payment_payerId_status_createdAt_idx";

-- DropIndex
DROP INDEX "Payment_status_createdAt_idx";

-- DropIndex
DROP INDEX "Payment_status_method_idx";

-- DropIndex
DROP INDEX "PurchaseRequest_buyerId_status_createdAt_idx";

-- DropIndex
DROP INDEX "PurchaseRequest_itemId_status_idx";

-- DropIndex
DROP INDEX "PurchaseRequest_status_createdAt_idx";

-- DropIndex
DROP INDEX "Referral_newUser_idx";

-- DropIndex
DROP INDEX "Referral_userId_idx";

-- DropIndex
DROP INDEX "Session_expires_idx";

-- DropIndex
DROP INDEX "Transaction_clientId_status_createdAt_idx";

-- DropIndex
DROP INDEX "Transaction_itemId_itemType_idx";

-- DropIndex
DROP INDEX "Transaction_ownerId_status_createdAt_idx";

-- DropIndex
DROP INDEX "User_isDeleted_isActive_createdAt_idx";

-- DropIndex
DROP INDEX "WalletLedger_userId_type_createdAt_idx";

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "listingTitle" TEXT NOT NULL DEFAULT '',
    "itemType" TEXT NOT NULL DEFAULT '',
    "participantIds" TEXT[],
    "participantNames" JSONB NOT NULL DEFAULT '{}',
    "lastMessage" TEXT NOT NULL DEFAULT '',
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageSenderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatUnread" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatUnread_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "stableId" TEXT,
    "clientMessageId" TEXT,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'SENT',
    "deliveredAt" TIMESTAMP(3),
    "seenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatConversation_lastMessageAt_idx" ON "ChatConversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatUnread_userId_idx" ON "ChatUnread"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_stableId_key" ON "ChatMessage"("stableId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_recipientId_isRead_idx" ON "ChatMessage"("recipientId", "isRead");

-- AddForeignKey
ALTER TABLE "ChatUnread" ADD CONSTRAINT "ChatUnread_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
