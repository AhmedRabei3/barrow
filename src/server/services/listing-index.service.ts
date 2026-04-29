/**
 * listing-index.service.ts
 *
 * Maintains the ListingSearchIndex table, which is a denormalized, single-table
 * representation of all 6 item types for fast cross-type search queries.
 *
 * Key functions:
 *  - upsertListingIndex  : called after every item create / update / status change
 *  - deleteListingIndex  : called after every soft-delete
 *  - seedListingIndex    : one-time backfill for existing records (run after migration)
 */

import { $Enums, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type IndexRecord = {
  id: string;
  itemType: $Enums.ItemType;
  title: string;
  brand: string | null;
  ownerId: string;
  categoryId: string | null;
  status: $Enums.Availability;
  sellOrRent: $Enums.TransactionType;
  rentType: $Enums.RentType | null;
  price: Prisma.Decimal;
  isDeleted: boolean;
  createdAt: Date;
  locationCity: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLng: number | null;
};

const locationSelect = {
  city: true,
  country: true,
  latitude: true,
  longitude: true,
} as const;

// ---------------------------------------------------------------------------
// Build record from the source table
// ---------------------------------------------------------------------------

async function buildIndexRecord(
  itemId: string,
  itemType: $Enums.ItemType,
): Promise<IndexRecord | null> {
  switch (itemType) {
    case $Enums.ItemType.NEW_CAR: {
      const item = await prisma.newCar.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          price: true,
          sellOrRent: true,
          rentType: true,
          status: true,
          ownerId: true,
          categoryId: true,
          isDeleted: true,
          createdAt: true,
          location: { select: locationSelect },
        },
      });
      if (!item) return null;
      return {
        id: item.id,
        itemType,
        title: `${item.brand} ${item.model} ${item.year}`,
        brand: item.brand,
        ownerId: item.ownerId,
        categoryId: item.categoryId,
        status: item.status,
        sellOrRent: item.sellOrRent,
        rentType: item.rentType,
        price: item.price,
        isDeleted: item.isDeleted,
        createdAt: item.createdAt,
        locationCity: item.location?.city ?? null,
        locationCountry: item.location?.country ?? null,
        locationLat: item.location?.latitude ?? null,
        locationLng: item.location?.longitude ?? null,
      };
    }

    case $Enums.ItemType.USED_CAR: {
      const item = await prisma.oldCar.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          brand: true,
          model: true,
          year: true,
          price: true,
          sellOrRent: true,
          rentType: true,
          status: true,
          ownerId: true,
          categoryId: true,
          isDeleted: true,
          createdAt: true,
          location: { select: locationSelect },
        },
      });
      if (!item) return null;
      return {
        id: item.id,
        itemType,
        title: `${item.brand} ${item.model} ${item.year}`,
        brand: item.brand,
        ownerId: item.ownerId,
        categoryId: item.categoryId,
        status: item.status,
        sellOrRent: item.sellOrRent,
        rentType: item.rentType,
        price: item.price,
        isDeleted: item.isDeleted,
        createdAt: item.createdAt,
        locationCity: item.location?.city ?? null,
        locationCountry: item.location?.country ?? null,
        locationLat: item.location?.latitude ?? null,
        locationLng: item.location?.longitude ?? null,
      };
    }

    case $Enums.ItemType.PROPERTY: {
      const item = await prisma.property.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          title: true,
          price: true,
          sellOrRent: true,
          rentType: true,
          status: true,
          ownerId: true,
          categoryId: true,
          isDeleted: true,
          createdAt: true,
          location: { select: locationSelect },
        },
      });
      if (!item) return null;
      return {
        id: item.id,
        itemType,
        title: item.title,
        brand: null,
        ownerId: item.ownerId,
        categoryId: item.categoryId,
        status: item.status,
        sellOrRent: item.sellOrRent,
        rentType: item.rentType,
        price: item.price,
        isDeleted: item.isDeleted,
        createdAt: item.createdAt,
        locationCity: item.location?.city ?? null,
        locationCountry: item.location?.country ?? null,
        locationLat: item.location?.latitude ?? null,
        locationLng: item.location?.longitude ?? null,
      };
    }

    case $Enums.ItemType.HOME_FURNITURE: {
      const item = await prisma.homeFurniture.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          brand: true,
          price: true,
          sellOrRent: true,
          rentType: true,
          status: true,
          ownerId: true,
          categoryId: true,
          isDeleted: true,
          createdAt: true,
          location: { select: locationSelect },
        },
      });
      if (!item) return null;
      return {
        id: item.id,
        itemType,
        title: item.brand ? `${item.name} ${item.brand}` : item.name,
        brand: item.brand ?? null,
        ownerId: item.ownerId,
        categoryId: item.categoryId,
        status: item.status,
        sellOrRent: item.sellOrRent,
        rentType: item.rentType,
        price: item.price,
        isDeleted: item.isDeleted,
        createdAt: item.createdAt,
        locationCity: item.location?.city ?? null,
        locationCountry: item.location?.country ?? null,
        locationLat: item.location?.latitude ?? null,
        locationLng: item.location?.longitude ?? null,
      };
    }

    case $Enums.ItemType.MEDICAL_DEVICE: {
      const item = await prisma.medicalDevice.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          manufacturer: true,
          price: true,
          sellOrRent: true,
          rentType: true,
          status: true,
          ownerId: true,
          categoryId: true,
          isDeleted: true,
          createdAt: true,
          location: { select: locationSelect },
        },
      });
      if (!item) return null;
      return {
        id: item.id,
        itemType,
        title: item.manufacturer
          ? `${item.name} ${item.manufacturer}`
          : item.name,
        brand: item.manufacturer ?? null,
        ownerId: item.ownerId,
        categoryId: item.categoryId,
        status: item.status,
        sellOrRent: item.sellOrRent,
        rentType: item.rentType,
        price: item.price,
        isDeleted: item.isDeleted,
        createdAt: item.createdAt,
        locationCity: item.location?.city ?? null,
        locationCountry: item.location?.country ?? null,
        locationLat: item.location?.latitude ?? null,
        locationLng: item.location?.longitude ?? null,
      };
    }

    case $Enums.ItemType.OTHER: {
      const item = await prisma.otherItem.findUnique({
        where: { id: itemId },
        select: {
          id: true,
          name: true,
          brand: true,
          price: true,
          sellOrRent: true,
          rentType: true,
          status: true,
          ownerId: true,
          categoryId: true,
          isDeleted: true,
          createdAt: true,
          location: { select: locationSelect },
        },
      });
      if (!item) return null;
      return {
        id: item.id,
        itemType,
        title: item.brand ? `${item.name} ${item.brand}` : item.name,
        brand: item.brand ?? null,
        ownerId: item.ownerId,
        categoryId: item.categoryId,
        status: item.status,
        sellOrRent: item.sellOrRent,
        rentType: item.rentType,
        price: item.price,
        isDeleted: item.isDeleted,
        createdAt: item.createdAt,
        locationCity: item.location?.city ?? null,
        locationCountry: item.location?.country ?? null,
        locationLat: item.location?.latitude ?? null,
        locationLng: item.location?.longitude ?? null,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create or update the search index entry for a single item.
 * Safe to call fire-and-forget (void). Errors are caught and logged.
 */
export async function upsertListingIndex(
  itemId: string,
  itemType: $Enums.ItemType,
): Promise<void> {
  try {
    const record = await buildIndexRecord(itemId, itemType);
    if (!record) return;

    await prisma.listingSearchIndex.upsert({
      where: { id: record.id },
      create: record,
      update: {
        itemType: record.itemType,
        title: record.title,
        brand: record.brand,
        ownerId: record.ownerId,
        categoryId: record.categoryId,
        status: record.status,
        sellOrRent: record.sellOrRent,
        rentType: record.rentType,
        price: record.price,
        isDeleted: record.isDeleted,
        locationCity: record.locationCity,
        locationCountry: record.locationCountry,
        locationLat: record.locationLat,
        locationLng: record.locationLng,
      },
    });
  } catch (err) {
    console.error(
      `[listing-index] upsert failed for ${itemType}:${itemId}`,
      err,
    );
  }
}

/**
 * Mark an item as deleted in the search index.
 * Call after a soft-delete operation.
 */
export async function deleteListingIndex(itemId: string): Promise<void> {
  try {
    await prisma.listingSearchIndex.updateMany({
      where: { id: itemId },
      data: { isDeleted: true },
    });
  } catch (err) {
    console.error(
      `[listing-index] deleteListingIndex failed for ${itemId}`,
      err,
    );
  }
}

/**
 * One-time backfill of all existing items into the search index.
 * Run this after the database migration.
 */
export async function seedListingIndex(): Promise<{ count: number }> {
  let totalCount = 0;
  const PARALLEL = 8; // concurrent upserts per batch

  const processType = async (
    type: $Enums.ItemType,
    ids: string[],
  ): Promise<void> => {
    for (let i = 0; i < ids.length; i += PARALLEL) {
      const batch = ids.slice(i, i + PARALLEL);
      await Promise.all(batch.map((id) => upsertListingIndex(id, type)));
      totalCount += batch.length;
    }
  };

  const [
    newCarIds,
    oldCarIds,
    propertyIds,
    furnitureIds,
    medicalIds,
    otherIds,
  ] = await Promise.all([
    prisma.newCar.findMany({ select: { id: true } }),
    prisma.oldCar.findMany({ select: { id: true } }),
    prisma.property.findMany({ select: { id: true } }),
    prisma.homeFurniture.findMany({ select: { id: true } }),
    prisma.medicalDevice.findMany({ select: { id: true } }),
    prisma.otherItem.findMany({ select: { id: true } }),
  ]);

  await processType(
    $Enums.ItemType.NEW_CAR,
    newCarIds.map((r) => r.id),
  );
  await processType(
    $Enums.ItemType.USED_CAR,
    oldCarIds.map((r) => r.id),
  );
  await processType(
    $Enums.ItemType.PROPERTY,
    propertyIds.map((r) => r.id),
  );
  await processType(
    $Enums.ItemType.HOME_FURNITURE,
    furnitureIds.map((r) => r.id),
  );
  await processType(
    $Enums.ItemType.MEDICAL_DEVICE,
    medicalIds.map((r) => r.id),
  );
  await processType(
    $Enums.ItemType.OTHER,
    otherIds.map((r) => r.id),
  );

  return { count: totalCount };
}
