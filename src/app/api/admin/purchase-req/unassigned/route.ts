import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { assertAdminCapability } from "@/app/api/utils/adminCapabilities";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    assertAdminCapability(admin, "USER_MANAGEMENT", "Access denied");

    const requests = await prisma.purchaseRequest.findMany({
      where: {
        assignedAdminId: null,
        status: "PENDING_ADMIN",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        buyer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ data: requests });
  } catch (error) {
    return handleApiError(error, req);
  }
}
