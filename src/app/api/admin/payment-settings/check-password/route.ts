import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";
import { requireOwnerUser } from "@/app/api/utils/authHelper";

/**
 * @description route to check the admin settings password. This is used to protect the admin settings page from unauthorized access.
 * @access private
 * @method POST
 * @body { password: string }
 * @returns { ok: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    await requireOwnerUser();
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

export async function GET() {
  try {
    await requireOwnerUser();
    const settings = await prisma.appPaymentSettings.findUnique({
      where: { id: 1 },
      select: { adminSettingsPassword: true },
    });

    return NextResponse.json({
      ok: true,
      hasPassword: Boolean(settings?.adminSettingsPassword),
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Failed to load password status" },
      { status: 500 },
    );
  }
}
