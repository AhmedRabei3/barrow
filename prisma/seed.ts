import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_OWNER_EMAIL = "rabie3ahm@gmail.com";
const DEFAULT_OWNER_PASSWORD = "myhvtWq49m#";
const DEFAULT_OWNER_NAME = "Ahmed Rabie";

type SeedUserSpec = {
  email: string;
  password: string;
  name: string;
  isAdmin?: boolean;
  isOwner?: boolean;
};

const SMOKE_USERS: SeedUserSpec[] = [
  {
    email: process.env.SMOKE_ADMIN_EMAIL || "ahmed@mail.com",
    password: process.env.SMOKE_ADMIN_PASSWORD || "12345678",
    name: "Smoke Admin",
    isAdmin: true,
  },
  {
    email: process.env.SMOKE_USER_EMAIL || "ali@mail.com",
    password: process.env.SMOKE_USER_PASSWORD || "12345678",
    name: "Smoke User",
    isAdmin: false,
  },
  {
    email: process.env.SMOKE_E2E_EMAIL || "e2e.user@example.com",
    password: process.env.SMOKE_E2E_PASSWORD || "Test@12345",
    name: "Smoke E2E User",
    isAdmin: false,
  },
];

async function upsertSeedUser(spec: SeedUserSpec) {
  const passwordHash = await bcrypt.hash(spec.password, 10);
  await prisma.user.upsert({
    where: { email: spec.email },
    create: {
      email: spec.email,
      name: spec.name,
      password: passwordHash,
      isAdmin: Boolean(spec.isAdmin),
      isOwner: Boolean(spec.isOwner),
      isActive: true,
      isIdentityVerified: true,
      emailVerified: new Date(),
    },
    update: {
      name: spec.name,
      password: passwordHash,
      isAdmin: Boolean(spec.isAdmin),
      isOwner: Boolean(spec.isOwner),
      isActive: true,
      isIdentityVerified: true,
      emailVerified: new Date(),
      isDeleted: false,
      deletedAt: null,
    },
  });

  console.log(`Seed upserted user ${spec.email}`);
}

async function main() {
  await upsertSeedUser({
    email: DEFAULT_OWNER_EMAIL,
    password: DEFAULT_OWNER_PASSWORD,
    name: DEFAULT_OWNER_NAME,
    isAdmin: true,
    isOwner: true,
  });

  for (const user of SMOKE_USERS) {
    await upsertSeedUser(user);
  }
}

main()
  .catch((error) => {
    console.error("Prisma seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
