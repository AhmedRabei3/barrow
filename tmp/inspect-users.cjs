const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.user.findMany({
    select: { id: true, email: true, name: true, isAdmin: true, isDeleted: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log(JSON.stringify(rows, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
