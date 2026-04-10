import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/app/api/utils/authHelper";

export async function GET() {
  await requireAdminUser();
  const requests = await prisma.shamCashActivationRequest.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminUser();
  const body = (await req.json()) as {
    id?: string;
    action?: string;
  };

  const id = String(body.id || "").trim();
  const action = String(body.action || "")
    .trim()
    .toUpperCase();

  if (!id || !action) {
    return NextResponse.json(
      { message: "Missing id or action" },
      { status: 400 },
    );
  }

  const existing = await prisma.shamCashActivationRequest.findUnique({
    where: { id },
    select: { id: true, adminNote: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ message: "Request not found" }, { status: 404 });
  }

  if (action === "MARK_REVIEWED") {
    const updated = await prisma.shamCashActivationRequest.update({
      where: { id },
      data: {
        status:
          existing.status === "PENDING" ? "ADMIN_REVIEW" : existing.status,
        adminNote: existing.adminNote || "Marked as reviewed by admin",
      },
    });

    return NextResponse.json({ request: updated });
  }

  if (action === "ASSIGN_TO_ME") {
    const assignmentLine = `Assigned to ${admin.id}`;
    const nextNote = existing.adminNote
      ? `${existing.adminNote}\n${assignmentLine}`
      : assignmentLine;

    const updated = await prisma.shamCashActivationRequest.update({
      where: { id },
      data: {
        status:
          existing.status === "PENDING" ? "ADMIN_REVIEW" : existing.status,
        adminNote: nextNote,
      },
    });

    return NextResponse.json({ request: updated });
  }

  return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
}
