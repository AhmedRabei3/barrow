import { NextRequest, NextResponse } from "next/server";
import { IdentityVerificationStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();

    const requests = await prisma.identityVerificationRequest.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isIdentityVerified: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    const body = (await req.json()) as {
      requestId?: string;
      decision?: "APPROVE" | "REJECT";
      adminNote?: string;
    };

    if (!body.requestId || !body.decision) {
      return NextResponse.json(
        { message: "requestId و decision مطلوبان" },
        { status: 400 },
      );
    }

    const verificationRequest =
      await prisma.identityVerificationRequest.findUnique({
        where: { id: body.requestId },
        include: { user: { select: { id: true, name: true } } },
      });

    if (!verificationRequest) {
      return NextResponse.json(
        { message: "طلب التوثيق غير موجود" },
        { status: 404 },
      );
    }

    const approved = body.decision === "APPROVE";

    await prisma.$transaction(async (tx) => {
      await tx.identityVerificationRequest.update({
        where: { id: verificationRequest.id },
        data: {
          status: approved
            ? IdentityVerificationStatus.APPROVED
            : IdentityVerificationStatus.REJECTED,
          adminNote: body.adminNote?.trim() || null,
          reviewedAt: new Date(),
          reviewedById: admin.id,
        },
      });

      await tx.user.update({
        where: { id: verificationRequest.userId },
        data: { isIdentityVerified: approved },
      });

      await tx.notification.create({
        data: {
          userId: verificationRequest.userId,
          title: approved ? "تم توثيق الحساب" : "تمت مراجعة طلب التوثيق",
          message: approved
            ? "وافق الأدمن على طلب توثيق حسابك، وأصبح حسابك موثقًا الآن."
            : body.adminNote?.trim() ||
              "تم رفض طلب التوثيق الحالي. يمكنك تحديث البيانات وإرسال طلب جديد.",
          type: approved ? NotificationType.INFO : NotificationType.WARNING,
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: approved ? "تم اعتماد التوثيق بنجاح" : "تم رفض طلب التوثيق",
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error, req);
  }
}
