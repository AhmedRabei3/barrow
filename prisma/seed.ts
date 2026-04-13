import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_OWNER_EMAIL = "rabie3ahm@gmail.com";
const DEFAULT_OWNER_PASSWORD = "myhvtWq49m#";
const DEFAULT_OWNER_NAME = "Ahmed Rabie";

async function main() {
  const existingOwner = await prisma.user.findFirst({
    where: { isOwner: true, isDeleted: false },
    select: { id: true, email: true },
  });

  if (existingOwner) {
    console.log("Seed skipped: owner already exists", existingOwner.email);
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 10);
  const existingByEmail = await prisma.user.findUnique({
    where: { email: DEFAULT_OWNER_EMAIL },
    select: { id: true, email: true },
  });

  if (existingByEmail) {
    await prisma.user.update({
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
    });

    console.log("Seed promoted existing user to owner", DEFAULT_OWNER_EMAIL);
    return;
  }

  await prisma.user.create({
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
  });

  console.log("Seed created default owner", DEFAULT_OWNER_EMAIL);
}

main()
  .catch((error) => {
    console.error("Prisma seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });