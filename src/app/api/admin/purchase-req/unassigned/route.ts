import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authHelper } from "@/app/api/utils/authHelper";
import { Errors } from "@/app/api/lib/errors/errors";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";

export async function GET(req: NextRequest) {
  try {
    const admin = await authHelper();

    if (!admin.isAdmin) {
      throw Errors.FORBIDDEN("هذه الصفحة مخصصة للمدراء فقط");
    }

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
