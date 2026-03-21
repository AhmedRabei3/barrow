// server/services/ownerService.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function verifyOwner(ownerId: string) {
  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { isActive: true, isDeleted: true },
  });

  if (!owner || !owner.isActive || owner.isDeleted) {
    return NextResponse.json(
      { success: false, message: "Account must be active" },
      { status: 403 }
    );
  }

  return owner;
}
