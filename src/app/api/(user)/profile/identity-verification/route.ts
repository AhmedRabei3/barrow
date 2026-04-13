import { NextRequest, NextResponse } from "next/server";
import { IdentityVerificationStatus, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "@/app/api/utils/cloudinary";

export async function GET(req: NextRequest) {
  try {
    const session = await authHelper();

    const request = await prisma.identityVerificationRequest.findUnique({
      where: { userId: session.id },
      select: {
        id: true,
        fullName: true,
        nationalId: true,
        frontImageUrl: true,
        backImageUrl: true,
        status: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
        reviewedAt: true,
      },
    });

    return NextResponse.json({ request }, { status: 200 });
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await authHelper();
    const formData = await req.formData();

    const fullName = String(formData.get("fullName") || "").trim();
    const nationalId = String(formData.get("nationalId") || "").trim();
    const frontImage = formData.get("frontImage");
    const backImage = formData.get("backImage");

    if (!fullName || fullName.length < 3) {
      return NextResponse.json(
        { message: "الاسم الرسمي مطلوب" },
        { status: 400 },
      );
    }

    if (!nationalId || nationalId.length < 6) {
      return NextResponse.json(
        { message: "الرقم الوطني غير صالح" },
        { status: 400 },
      );
    }

    if (!(frontImage instanceof File) || !(backImage instanceof File)) {
      return NextResponse.json(
        { message: "يجب رفع صور الهوية للجهتين" },
        { status: 400 },
      );
    }

    if (
      !frontImage.type.startsWith("image/") ||
      !backImage.type.startsWith("image/")
    ) {
      return NextResponse.json(
        { message: "الملفات المرفوعة يجب أن تكون صورًا" },
        { status: 400 },
      );
    }

    const existingRequest = await prisma.identityVerificationRequest.findUnique(
      {
        where: { userId: session.id },
        select: {
          id: true,
          frontImagePublicId: true,
          backImagePublicId: true,
          status: true,
        },
      },
    );

    const [frontUpload, backUpload, admins] = await Promise.all([
      uploadToCloudinary(frontImage, "identity-verifications/front"),
      uploadToCloudinary(backImage, "identity-verifications/back"),
      prisma.user.findMany({
        where: {
          isDeleted: false,
          OR: [{ isAdmin: true }, { isOwner: true }],
        },
        select: { id: true },
      }),
    ]);

    await prisma.$transaction(async (tx) => {
      await tx.identityVerificationRequest.upsert({
        where: { userId: session.id },
        create: {
          userId: session.id,
          fullName,
          nationalId,
          frontImageUrl: frontUpload.secure_url,
          frontImagePublicId: frontUpload.public_id,
          backImageUrl: backUpload.secure_url,
          backImagePublicId: backUpload.public_id,
          status: IdentityVerificationStatus.PENDING,
        },
        update: {
          fullName,
          nationalId,
          frontImageUrl: frontUpload.secure_url,
          frontImagePublicId: frontUpload.public_id,
          backImageUrl: backUpload.secure_url,
          backImagePublicId: backUpload.public_id,
          status: IdentityVerificationStatus.PENDING,
          adminNote: null,
          reviewedAt: null,
          reviewedById: null,
        },
      });

      await tx.user.update({
        where: { id: session.id },
        data: { isIdentityVerified: false },
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: "طلب توثيق حساب جديد",
            message: `قام المستخدم ${session.name || session.email || session.id} بإرسال طلب توثيق حساب جديد بانتظار المراجعة.`,
            type: NotificationType.INFO,
          })),
        });
      }
    });

    if (existingRequest) {
      const oldImages = [
        existingRequest.frontImagePublicId,
        existingRequest.backImagePublicId,
      ]
        .filter(Boolean)
        .map((publicId) => ({ secure_url: "", public_id: publicId }));

      if (oldImages.length > 0) {
        void deleteFromCloudinary(oldImages).catch((error) => {
          console.error(
            "Failed to remove old identity verification images",
            error,
          );
        });
      }
    }

    return NextResponse.json(
      { success: true, message: "تم إرسال طلب التوثيق إلى الإدارة" },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error, req);
  }
}
