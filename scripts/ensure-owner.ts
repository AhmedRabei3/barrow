import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_OWNER_EMAIL = "rabie3ahm@gmail.com";
const DEFAULT_OWNER_PASSWORD = "myhvtWq49m#";
const DEFAULT_OWNER_NAME = "Ahmed Rabie";

async function ensureOwnerAccount() {
  const existingOwner = await prisma.user.findFirst({
    where: { isOwner: true, isDeleted: false },
    select: { id: true, email: true },
  });

  if (existingOwner) {
    return { owner: existingOwner, action: "existing-owner" as const };
  }

  const passwordHash = await bcrypt.hash(DEFAULT_OWNER_PASSWORD, 10);
  const existingByEmail = await prisma.user.findUnique({
    where: { email: DEFAULT_OWNER_EMAIL },
    select: { id: true, email: true },
  });

  if (existingByEmail) {
    const owner = await prisma.user.update({
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

    return { owner, action: "promoted-existing-user" as const };
  }

  const owner = await prisma.user.create({
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

  return { owner, action: "created-owner" as const };
}

async function main() {
  const result = await ensureOwnerAccount();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("Failed to ensure owner account", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
