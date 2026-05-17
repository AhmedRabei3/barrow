import { NextResponse } from "next/server";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { resolveAdminCapabilities } from "@/app/api/utils/adminCapabilities";

export async function GET() {
  const admin = await requireAdminUser();

  return NextResponse.json(
    {
      isOwner: Boolean(admin.isOwner),
      capabilities: resolveAdminCapabilities(admin),
    },
    { status: 200 },
  );
}
