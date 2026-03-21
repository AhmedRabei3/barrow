import { prisma } from "@/lib/prisma";

/**
 * @description find item by id and return it 
 */

export async function itemById(id: string) {
  await Promise.all([
    prisma.property.findUnique({
      where: { id },
    }),
    prisma.otherItem.findUnique({ where: { id } }),
    prisma.newCar.findUnique({ where: { id } }),
    prisma.oldCar.findUnique({ where: { id } }),
  ]);
}
