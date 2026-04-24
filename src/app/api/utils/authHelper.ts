import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Errors } from "../lib/errors/errors";
import { User } from "next-auth";

export async function authHelper(): Promise<User & { id: string }> {
  const session = await auth();

  if (!session?.user?.id) {
    throw Errors.UNAUTHORIZED();
  }

  return session.user;
}

export async function requireActiveUser() {
  const user = await authHelper();
  const active = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, isActive: true, isDeleted: true },
  });

  if (!active || !active.isActive || active.isDeleted) {
    throw Errors.FORBIDDEN("Your account is not active");
  }

  return active;
}
export async function activeUser() {
  const user = await authHelper();
  const active = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      isActive: true,
      isDeleted: true,
      isAdmin: true,
      isOwner: true,
    },
  });
  return active;
}

export async function requireAdminUser() {
  const user = await authHelper();
  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      isOwner: true,
      isDeleted: true,
    },
  });

  if (!admin || admin.isDeleted || !admin.isAdmin) {
    throw Errors.FORBIDDEN("Access denied");
  }

  return admin;
}

export async function requireOwnerUser() {
  const user = await authHelper();
  const owner = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, isAdmin: true, isOwner: true, isDeleted: true },
  });

  if (!owner || owner.isDeleted || !owner.isOwner) {
    throw Errors.FORBIDDEN("Owner access required");
  }

  return owner;
}
