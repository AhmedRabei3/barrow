import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";

/**
 * @description مسار جلب بيانات مستخدم عبر رقم المعرف
 * @access public
 * @route ~api/profile/[id]
 * @method GET
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const isArabic = resolveIsArabicFromRequest(req);
  const { id: userId } = await params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        password: false,
        profileImage: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: localizeErrorMessage("User not found", isArabic) },
        { status: 404 },
      );
    }
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
