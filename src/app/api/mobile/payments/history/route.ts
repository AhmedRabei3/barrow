import { NextResponse } from "next/server";
import {
  type AuthedRequest,
  withMobileOrWebAuth,
} from "@/app/middlewares/auth.middleware";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { prisma } from "@/lib/prisma";

export const GET = withMobileOrWebAuth(async (req: AuthedRequest) => {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        OR: [{ payerId: req.user.id }, { payeeId: req.user.id }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        payerId: true,
        payeeId: true,
        transactionId: true,
        amount: true,
        currency: true,
        method: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      data: payments.map((payment) => ({
        id: payment.id,
        direction: payment.payerId === req.user.id ? "OUT" : "IN",
        transactionId: payment.transactionId,
        amount: Number(payment.amount),
        currency: payment.currency,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, req);
  }
});
