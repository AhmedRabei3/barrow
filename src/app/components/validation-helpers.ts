/**
 * دوال التحقق الآمنة من البيانات
 */

type GenericRecord = Record<string, unknown>;

const asRecord = (value: unknown): GenericRecord | null => {
  return value && typeof value === "object" ? (value as GenericRecord) : null;
};

export const isValidItem = (item: unknown): boolean => {
  return !!asRecord(item) && "id" in (item as GenericRecord);
};

export const isValidImage = (img: unknown): boolean => {
  const record = asRecord(img);
  return !!record && typeof record.url === "string";
};

export const isValidOrder = (order: unknown): boolean => {
  const record = asRecord(order);
  return (
    !!record && "id" in record && "status" in record && "createdAt" in record
  );
};

export const sanitizeItem = (item: unknown) => {
  const record = asRecord(item) || {};
  return {
    id: String(record.id || ""),
    brand: String(record.brand || ""),
    model: String(record.model || ""),
    year: Number(record.year || 0),
    price: Number(record.price || 0),
    sellOrRent: String(record.sellOrRent || "SELL"),
    rentType: record.rentType || undefined,
    isNew: Boolean(record.isNew),
    isFeatured: Boolean(record.isFeatured),
    title: String(record.title || "بدون عنوان"),
    location: record.location || null,
    images: Array.isArray(record.images) ? record.images : [],
    category: record.category || null,
  };
};

export const sanitizeImages = (images: unknown) => {
  if (!Array.isArray(images)) return [];
  return images.filter(isValidImage);
};

export const sanitizeOrder = (order: unknown) => {
  const record = asRecord(order) || {};
  return {
    id: String(record.id || ""),
    itemName: String(record.itemName || "طلب"),
    amount: Number(record.amount || 0),
    status: String(record.status || "PENDING"),
    createdAt: String(record.createdAt || new Date().toISOString()),
    completedAt: record.completedAt || undefined,
  };
};

export const sanitizeOrders = (orders: unknown) => {
  if (!Array.isArray(orders)) return [];
  return orders.filter(isValidOrder).map(sanitizeOrder);
};
