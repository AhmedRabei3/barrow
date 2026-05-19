import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const runId = `sim_${Date.now()}`;
  const now = new Date();

  const admin = await prisma.user.create({
    data: {
      email: `admin.${runId}@example.com`,
      name: `Admin ${runId}`,
      isAdmin: true,
      isActive: true,
      activeUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    select: { id: true, email: true, name: true, isAdmin: true },
  });

  const user = await prisma.user.create({
    data: {
      email: `user.${runId}@example.com`,
      name: `User ${runId}`,
      isActive: true,
      balance: 200,
      pendingReferralEarnings: 35,
      activeUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    select: {
      id: true,
      email: true,
      name: true,
      balance: true,
      pendingReferralEarnings: true,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      payerId: user.id,
      payeeId: admin.id,
      amount: 25,
      currency: "USD",
      method: "SHAMCASH",
      status: "COMPLETED",
    },
    select: {
      id: true,
      amount: true,
      currency: true,
      method: true,
      status: true,
      createdAt: true,
    },
  });

  await prisma.chargingLog.create({
    data: {
      userId: user.id,
      type: "SHAMCASH_TEST_PAYMENT",
      amount: 25,
    },
  });

  const withdrawalCompleted = await prisma.$transaction(async (tx) => {
    const request = await tx.shamCashManualWithdrawal.create({
      data: {
        userId: user.id,
        amount: 40,
        currency: "USD",
        walletCode: "WALLET-USER-001",
        note: "Test withdrawal - should complete",
        status: "PENDING_ADMIN",
      },
      select: { id: true, amount: true, currency: true, status: true },
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        balance: { decrement: 40 },
      },
    });

    await tx.chargingLog.create({
      data: {
        userId: user.id,
        type: "SHAMCASH_MANUAL_WITHDRAWAL",
        amount: -40,
      },
    });

    const updated = await tx.shamCashManualWithdrawal.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        transactionId: `TX-${runId}-COMPLETE`,
        completedAt: new Date(),
        verifiedAt: new Date(),
        verifiedByAdminId: admin.id,
        completedByAdminId: admin.id,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        transactionId: true,
        completedAt: true,
      },
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        title: "✅ Withdrawal completed",
        message: `Your test withdrawal ${updated.id} was completed.`,
      },
    });

    return updated;
  });

  const withdrawalRejected = await prisma.$transaction(async (tx) => {
    const request = await tx.shamCashManualWithdrawal.create({
      data: {
        userId: user.id,
        amount: 15,
        currency: "USD",
        walletCode: "WALLET-USER-001",
        note: "Test withdrawal - should reject",
        status: "PENDING_ADMIN",
      },
      select: { id: true },
    });

    const rejected = await tx.shamCashManualWithdrawal.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        failureReason: "Rejected by test admin flow",
        completedByAdminId: admin.id,
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        failureReason: true,
        updatedAt: true,
      },
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        title: "⚠️ Withdrawal rejected",
        message: `Your test withdrawal ${rejected.id} was rejected.`,
      },
    });

    return rejected;
  });

  const finalUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      balance: true,
      pendingReferralEarnings: true,
    },
  });

  const withdrawals = await prisma.shamCashManualWithdrawal.findMany({
    where: { userId: user.id },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      walletCode: true,
      status: true,
      transactionId: true,
      failureReason: true,
      requestedAt: true,
      updatedAt: true,
    },
  });

  const chargingLogs = await prisma.chargingLog.findMany({
    where: {
      userId: user.id,
      type: { in: ["SHAMCASH_TEST_PAYMENT", "SHAMCASH_MANUAL_WITHDRAWAL"] },
    },
    orderBy: { createdAt: "asc" },
    select: {
      type: true,
      amount: true,
      createdAt: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        runId,
        admin,
        userInitial: user,
        payment,
        withdrawalCompleted,
        withdrawalRejected,
        finalUser,
        withdrawals,
        chargingLogs,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Simulation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
