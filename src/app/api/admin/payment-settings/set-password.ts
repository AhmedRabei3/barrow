import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ ok: false, message: "Password too short" });
    }
    const hash = await bcrypt.hash(password, 10);
    await prisma.appPaymentSettings.upsert({
      where: { id: 1 },
      update: { adminSettingsPassword: hash },
      create: {
        id: 1,
        subscriptionMonthlyPrice: 30,
        featuredAdMonthlyPrice: 10,
        adminSettingsPassword: hash,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
