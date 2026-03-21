/**
 * مساعدات لتنسيق البيانات الآمنة
 */

type GenericObject = Record<string, unknown>;
type GenericLocation = {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
};

export const formatItem = (item: GenericObject) => {
  const location = item.location as string | GenericLocation | undefined;
  return {
    id: item.id,
    brand: item.brand,
    model: item.model,
    year: item.year,
    price: item.price,
    sellOrRent: item.sellOrRent,
    rentType: item.rentType,
    isNew: item.isNew,
    isFeatured: item.isFeatured,
    title: item.title,
    // استخراج عنوان من location object أو string
    locationText:
      typeof location === "string"
        ? location
        : location?.address || location?.city || "موقع غير محدد",
    images: (item.images as unknown[]) || [],
  };
};

export const formatLocation = (
  location: string | GenericLocation | null | undefined,
): string => {
  if (!location) return "موقع غير محدد";
  if (typeof location === "string") return location;

  // إذا كان object، جمع أكثر المعلومات تفصيلاً
  const parts = [];
  if (location.address) parts.push(location.address);
  if (location.city) parts.push(location.city);
  if (location.state) parts.push(location.state);
  if (location.country) parts.push(location.country);

  return parts.length > 0 ? parts.join(", ") : "موقع غير محدد";
};

export const formatOrder = (order: GenericObject) => {
  return {
    id: order.id,
    itemName: order.itemName || "طلب",
    amount: order.amount || 0,
    status: order.status || "PENDING",
    createdAt: order.createdAt,
    completedAt: order.completedAt,
  };
};
