import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const DEFAULT_OWNER_EMAIL = "rabie3ahm@gmail.com";
const DEFAULT_OWNER_PASSWORD = "myhvtWq49m#";
const DEFAULT_OWNER_NAME = "Ahmed Rabie";

export async function ensureOwnerAccount() {
  const existingOwner = await prisma.user.findFirst({
    where: { isOwner: true, isDeleted: false },
    select: { id: true, email: true },
  });

  if (existingOwner) {
    return existingOwner;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 10);
  const existingByEmail = await prisma.user.findUnique({
    where: { email: DEFAULT_OWNER_EMAIL },
    select: { id: true },
  });

  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        name: DEFAULT_OWNER_NAME,
        password: passwordHash,
        isAdmin: true,
        isOwner: true,
        isActive: true,
        isIdentityVerified: true,
        emailVerified: new Date(),
      },
      select: { id: true, email: true },
    });
  }

  return prisma.user.create({
    data: {
      email: DEFAULT_OWNER_EMAIL,
      name: DEFAULT_OWNER_NAME,
      password: passwordHash,
      isAdmin: true,
      isOwner: true,
      isActive: true,
      isIdentityVerified: true,
      emailVerified: new Date(),
    },
    select: { id: true, email: true },
  });
}
