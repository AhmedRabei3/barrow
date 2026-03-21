import { prisma } from "@/lib/prisma";

interface TypeFounderProps {
  id: string;
}

/**
 * 🔍 دالة لتحديد نوع العنصر من خلال الـ id
 * - تبحث بشكل متسلسل في الجداول لتحديد المودل بدقة
 */
export async function modelSetter({ id }: TypeFounderProps): Promise<
  "property" | "otherItem" | "newCar" | "oldCar" | undefined
> {
  if (!id) return undefined;

  // ✅ نبحث بالتوازي لتحسين الأداء
  const [property, otherItem, newCar, oldCar] = await Promise.all([
    prisma.property.findUnique({ where: { id }, select: { id: true } }),
    prisma.otherItem.findUnique({ where: { id }, select: { id: true } }),
    prisma.newCar.findUnique({ where: { id }, select: { id: true } }),
    prisma.oldCar.findUnique({ where: { id }, select: { id: true } }),
  ]);

  if (property) return "property";
  if (otherItem) return "otherItem"; // ✅ تم تصحيح الخطأ الكتابي "otehrItem"
  if (newCar) return "newCar";
  if (oldCar) return "oldCar";

  return undefined;
}
