// src/app/api/(user)/referrals/route.ts
// جلب قائمة المدعوين للمستخدم الحالي مع حالة كل منهم (مفعّل / غير مفعّل)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

export async function GET(req: NextRequest) {
  try {
    const session = await authHelper();

    // جلب جميع الإحالات الخاصة بالمستخدم مع بيانات المدعو
    const referrals = await prisma.referral.findMany({
      where: { userId: session.id! },
      orderBy: { id: "desc" },
      include: {
        // نقرأ بيانات المستخدم المدعو من جدول User عبر الحقل newUser
        user: false, // علاقة الداعي — لا نحتاجها هنا
      },
    });

    // جلب بيانات المدعوين دفعةً واحدة لتجنب N+1
    const inviteeIds = referrals.map((r) => r.newUser);

    const invitees = inviteeIds.length
      ? await prisma.user.findMany({
          where: { id: { in: inviteeIds }, isDeleted: false },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isActive: true,
          },
        })
      : [];

    // بناء خريطة لتسريع البحث
    const inviteeMap = new Map(invitees.map((u) => [u.id, u]));

    const result = referrals
      .map((r) => {
        const invitee = inviteeMap.get(r.newUser);
        if (!invitee) return null;
        return {
          id: r.id,
          userId: invitee.id,
          name: invitee.name ?? "مستخدم",
          email: invitee.email,
          image: invitee.image ?? null,
          isActive: invitee.isActive ?? false,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error, req);
  }
}
