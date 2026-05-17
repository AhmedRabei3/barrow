import { Errors } from "@/app/api/lib/errors/errors";
import { assertAdminCapability } from "@/app/api/utils/adminCapabilities";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const admin = await requireAdminUser();
  const { requestId } = await params;

  assertAdminCapability(
    admin,
    "USER_MANAGEMENT",
    "عذراً هذه الخاصية متاحة للمشرفين فقط",
  );

  const request = await prisma.purchaseRequest.findFirst({
    where: {
      id: requestId,
      assignedAdminId: admin.id,
    },
  });

  if (!request) throw Errors.NOT_FOUND();

  return NextResponse.json(request);
}
