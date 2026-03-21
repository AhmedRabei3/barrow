import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * @description موافقة أو رفض المالك على طلب الإيجار
 * @route PATCH ~/api/transaction/manage
 */
export async function PATCH(req: NextRequest) {
  try {
    const { transactionId, action } = await req.json();

    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ message: "غير مصرح" }, { status: 401 });

    const owner = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!owner)
      return NextResponse.json(
        { message: "المالك غير موجود" },
        { status: 404 },
      );

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { payment: true, platformBalances: true },
    });

    if (!transaction)
      return NextResponse.json(
        { message: "المعاملة غير موجودة" },
        { status: 404 },
      );

    if (transaction.ownerId !== owner.id)
      return NextResponse.json({ message: "ممنوع" }, { status: 403 });

    const payment = transaction.payment;
    if (!payment)
      return NextResponse.json({ message: "لا يوجد سجل دفع" }, { status: 400 });
    const paymentAmount = Number(payment.amount);

    const renter = await prisma.user.findUnique({
      where: { id: transaction.clientId },
    });
    if (!renter)
      return NextResponse.json(
        { message: "المستأجر غير موجود" },
        { status: 404 },
      );

    if (action === "APPROVE") {
      const feePercentage = 5;
      const feeAmount = (paymentAmount * feePercentage) / 100;
      const ownerAmount = paymentAmount - feeAmount;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: owner.id },
          data: { balance: { increment: ownerAmount } },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "COMPLETED" },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "APPROVED" },
        }),
        prisma.notification.create({
          data: {
            userId: renter.id,
            title: "تمت الموافقة على الحجز ✅",
            message: `تمت الموافقة على طلبك لاستئجار العنصر من ${owner.name}.`,
            type: "INFO",
          },
        }),
      ]);

      return NextResponse.json(
        { message: "تمت الموافقة على المعاملة" },
        { status: 200 },
      );
    }

    if (action === "REJECT") {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: renter.id },
          data: { balance: { increment: paymentAmount } },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" },
        }),
        prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "REJECTED" },
        }),
        prisma.notification.create({
          data: {
            userId: renter.id,
            title: "تم الرفض",
            message: `تم رفض طلبك من قبل المالك: ${owner.name}`,
            type: "INFO",
          },
        }),
      ]);

      return NextResponse.json(
        { message: "تم رفض المعاملة واسترجاع " },
        { status: 200 },
      );
    }

    return NextResponse.json({ message: "إجراء غير صالح" }, { status: 400 });
  } catch (error) {
    console.error("❌ خطأ في إدارة المعاملة:", error);
    return NextResponse.json(
      { message: "حدث خطأ أثناء تنفيذ العملية", error: `${error}` },
      { status: 500 },
    );
  }
}
