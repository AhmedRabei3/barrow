import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "../../utils/authHelper";

/**
 * @description create new activation code
 * @route ~/api/admin/active_code
 * @access private (Admin Only)
 * @method POST
 */

export async function POST(req: NextRequest) {
  await requireAdminUser();
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
        { error: "المدخلات غير صحيحة" },
        { status: 400 },
      );
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
      { error: "حدث خطأ داخلي في الخادم" },
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
  await requireAdminUser();
  try {
    const codes = await prisma.activationCode.findMany({
      select: {
        id: true,
        code: true,
        balance: true,
        used: true,
        createdAt: true,
      },
      orderBy: [{ used: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(codes, { status: 200 });
  } catch (error) {
    console.error("🔥 get activation codes error:", error);
    return NextResponse.json(
      { error: "حدث خطأ داخلي في الخادم" },
      { status: 500 },
    );
  }
}
