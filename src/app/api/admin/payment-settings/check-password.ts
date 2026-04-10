import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password) return NextResponse.json({ ok: false });
    const settings = await prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
    });
    if (!settings?.adminSettingsPassword)
      return NextResponse.json({ ok: false });
    const match = await bcrypt.compare(
      password,
      settings.adminSettingsPassword,
    );
    return NextResponse.json({ ok: !!match });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
