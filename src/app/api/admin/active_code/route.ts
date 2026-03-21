import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * @description create new activation code
 * @route ~/api/admin/active_code
 * @access private (Admin Only)
 * @method POST
 */

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  try {
    const { balance, countOfCodes } = await req.json();

    // 🛑 Validation يدوي (سريع وخفيف)
    if (
      typeof balance !== "number" ||
      balance <= 0 ||
      typeof countOfCodes !== "number" ||
      countOfCodes < 1 ||
      countOfCodes > 100
    ) {
      return NextResponse.json(
        { message: "المدخلات غير صحيحة" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.isAdmin || user.isDeleted) {
      return NextResponse.json({ message: "ممنوع" }, { status: 403 });
    }

    // ✅ Transaction لضمان الذرّية
    const createdCodes = await prisma.$transaction(
      Array.from({ length: countOfCodes }).map(() =>
        prisma.activationCode.create({
          data: { balance },
        }),
      ),
    );

    return NextResponse.json(
      {
        message: "تم إنشاء رموز التفعيل بنجاح",
        count: createdCodes.length,
        codes: createdCodes,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("🔥 create activation code error:", error);
    return NextResponse.json(
      { success: false, message: "حدث خطأ داخلي في الخادم" },
      { status: 500 },
    );
  }
}

/**
 * @description Get all activation code
 * @access private
 * @route ~/api/admin/active_code
 * @method GET
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "غير مصرح" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.isAdmin || user.isDeleted) {
      return NextResponse.json({ message: "ممنوع" }, { status: 403 });
    }

    const codes = await prisma.activationCode.findMany({
      select: {
        id: true,
        code: true,
        balance: true,
      },
      orderBy: { balance: "desc" },
    });

    return NextResponse.json(codes, { status: 200 });
  } catch (error) {
    console.error("🔥 get activation codes error:", error);
    return NextResponse.json(
      { message: "حدث خطأ داخلي في الخادم" },
      { status: 500 },
    );
  }
}
