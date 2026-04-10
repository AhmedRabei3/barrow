import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";

export async function POST(req: NextRequest) {
  await requireAdminUser();

  try {
    const { id, reason } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const activationRequest = await prisma.shamCashActivationRequest.findUnique(
      {
        where: { id },
      },
    );
    if (!activationRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (activationRequest.status === "ACTIVATED") {
      return NextResponse.json(
        { error: "Activated requests cannot be rejected" },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (activationRequest.status === "VERIFIED") {
        const provisionalCredits = await tx.walletLedger.findMany({
          where: {
            userId: activationRequest.userId,
            referenceId: activationRequest.id,
            type: "CREDIT",
          },
          select: {
            amount: true,
          },
        });

        const creditedAmount = provisionalCredits.reduce(
          (sum, entry) => sum + Number(entry.amount ?? 0),
          0,
        );

        if (creditedAmount > 0) {
          const user = await tx.user.findUnique({
            where: { id: activationRequest.userId },
            select: { balance: true },
          });

          if (Number(user?.balance ?? 0) < creditedAmount) {
            throw new Error(
              "Cannot reject this request because the provisional credited balance was already used",
            );
          }

          await tx.user.update({
            where: { id: activationRequest.userId },
            data: {
              balance: { decrement: creditedAmount },
            },
          });

          await tx.walletLedger.create({
            data: {
              userId: activationRequest.userId,
              amount: creditedAmount,
              type: "DEBIT",
              referenceId: activationRequest.id,
            },
          });

          await tx.chargingLog.create({
            data: {
              userId: activationRequest.userId,
              type: "SHAMCASH_ACTIVATION_REJECT_ROLLBACK",
              amount: -creditedAmount,
            },
          });

          const paymentTimeStart = new Date(
            activationRequest.createdAt.getTime() - 10 * 60 * 1000,
          );
          const paymentTimeEnd = new Date(
            activationRequest.createdAt.getTime() + 10 * 60 * 1000,
          );

          const provisionalPayments = await tx.payment.findMany({
            where: {
              payerId: activationRequest.userId,
              method: "SHAMCASH",
              status: "COMPLETED",
              amount: activationRequest.amount,
              createdAt: {
                gte: paymentTimeStart,
                lte: paymentTimeEnd,
              },
            },
            select: { id: true },
          });

          if (provisionalPayments.length > 0) {
            await tx.payment.updateMany({
              where: {
                id: { in: provisionalPayments.map((payment) => payment.id) },
              },
              data: { status: "REFUNDED" },
            });
          }
        }
      }

      await tx.shamCashActivationRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          checkedByWorker: true,
          isValid: false,
          adminNote: reason || null,
        },
      });

      await tx.notification.create({
        data: {
          userId: activationRequest.userId,
          title: "تم رفض طلب التفعيل",
          message:
            reason ||
            "نعتذر، لم يتم قبول طلب التفعيل الخاص بك. لمزيد من التفاصيل راجع مركز الدعم.",
          type: "ERROR",
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reject request";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
