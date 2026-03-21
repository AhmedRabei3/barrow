import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireProfileEditTicket } from "../../utils/profileEditVerification";

/**
 * @description route to add profile image
 */

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!currentUser) {
      return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
    }

    requireProfileEditTicket(req, {
      userId: session.user.id,
      email: currentUser.email,
    });

    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ message: "لم يتم رفع ملف" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await new Promise<{ secure_url?: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "myApp/profiles" }, (err, result) => {
            if (err) reject(err);
            resolve({ secure_url: result?.secure_url });
          })
          .end(buffer);
      },
    );

    if (!uploadResult.secure_url) {
      return NextResponse.json(
        { message: "فشل رفع الصورة إلى Cloudinary" },
        { status: 500 },
      );
    }

    // تحديث المستخدم بالصورة
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { profileImage: uploadResult.secure_url },
    });

    return NextResponse.json({
      message: "تم تحديث صورة الملف الشخصي بنجاح",
      user: updatedUser,
    });
  } catch {
    return NextResponse.json(
      { message: "حدث خطأ أثناء رفع الصورة" },
      { status: 500 },
    );
  }
}
