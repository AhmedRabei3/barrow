-- CreateTable
CREATE TABLE "ProfileEditVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileEditVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileEditVerificationCode_userId_createdAt_idx" ON "ProfileEditVerificationCode"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileEditVerificationCode_expiresAt_idx" ON "ProfileEditVerificationCode"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProfileEditVerificationCode" ADD CONSTRAINT "ProfileEditVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
