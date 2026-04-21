import { NextResponse, NextRequest } from "next/server";
import { ensurePrismaConnection, prisma } from "@/lib/prisma";
import { ItemType, Prisma } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import {
  RequestTimeoutError,
  isDatabaseUnavailableError,
  withTimeout,
} from "@/app/api/lib/errors/dbGuard";

type CategoryListItem = {
  id: string;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
  icon: string | null;
  type: ItemType;
  isDeleted: boolean;
};

type CategoryQueryResult = {
  categories: CategoryListItem[];
  totalCount: number;
};

const CATEGORY_RESPONSE_TTL_MS = 2 * 60 * 1000;
const CATEGORY_RESPONSE_STALE_TTL_MS = 30 * 60 * 1000;
const ACTIVE_CATEGORY_IDS_TTL_MS = 2 * 60 * 1000;
const ACTIVE_CATEGORY_IDS_STALE_TTL_MS = 30 * 60 * 1000;

const categoriesResponseCache = new Map<
  string,
  { expiresAt: number; staleUntil: number; value: CategoryQueryResult }
>();

const activeCategoryIdsCache = new Map<
  string,
  { expiresAt: number; staleUntil: number; value: string[] }
>();

const readCachedCategoryResult = (cacheKey: string, allowStale = false) => {
  const cached = categoriesResponseCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  const now = Date.now();

  if (cached.staleUntil <= now) {
    categoriesResponseCache.delete(cacheKey);
    return null;
  }

  if (!allowStale && cached.expiresAt <= now) {
    return null;
  }

  return cached.value;
};

const writeCachedCategoryResult = (
  cacheKey: string,
  value: CategoryQueryResult,
) => {
  categoriesResponseCache.set(cacheKey, {
    expiresAt: Date.now() + CATEGORY_RESPONSE_TTL_MS,
    staleUntil: Date.now() + CATEGORY_RESPONSE_STALE_TTL_MS,
    value,
  });
};

const readCachedActiveCategoryIds = (cacheKey: string, allowStale = false) => {
  const cached = activeCategoryIdsCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  const now = Date.now();

  if (cached.staleUntil <= now) {
    activeCategoryIdsCache.delete(cacheKey);
    return null;
  }

  if (!allowStale && cached.expiresAt <= now) {
    return null;
  }

  return cached.value;
};

const writeCachedActiveCategoryIds = (cacheKey: string, value: string[]) => {
  activeCategoryIdsCache.set(cacheKey, {
    expiresAt: Date.now() + ACTIVE_CATEGORY_IDS_TTL_MS,
    staleUntil: Date.now() + ACTIVE_CATEGORY_IDS_STALE_TTL_MS,
    value,
  });
};

const buildCategoryCacheKey = ({
  type,
  needle,
  withItemsOnly,
}: {
  type: string | null;
  needle: string | null;
  withItemsOnly: boolean;
}) =>
  JSON.stringify({
    type: type?.trim().toUpperCase() ?? "ALL",
    needle: needle?.trim().toLowerCase() ?? "",
    withItemsOnly,
  });

const getDistinctCategoryIds = async (
  type: ItemType | null,
): Promise<string[]> => {
  if (type === ItemType.NEW_CAR) {
    const rows = await prisma.$queryRaw<Array<{ categoryId: string }>>`
      SELECT DISTINCT "categoryId"
      FROM "NewCar"
      WHERE "isDeleted" = false AND "status" = 'AVAILABLE'::"Availability"
    `;

    return rows.map((row) => row.categoryId);
  }

  if (type === ItemType.USED_CAR) {
    const rows = await prisma.$queryRaw<Array<{ categoryId: string }>>`
      SELECT DISTINCT "categoryId"
      FROM "OldCar"
      WHERE "isDeleted" = false AND "status" = 'AVAILABLE'::"Availability"
    `;

    return rows.map((row) => row.categoryId);
  }

  if (type === ItemType.PROPERTY) {
    const rows = await prisma.$queryRaw<Array<{ categoryId: string }>>`
      SELECT DISTINCT "categoryId"
      FROM "Property"
      WHERE "isDeleted" = false AND "status" = 'AVAILABLE'::"Availability"
    `;

    return rows.map((row) => row.categoryId);
  }

  if (type === ItemType.OTHER) {
    const rows = await prisma.$queryRaw<Array<{ categoryId: string }>>`
      SELECT DISTINCT "categoryId"
      FROM "OtherItem"
      WHERE "isDeleted" = false AND "status" = 'AVAILABLE'::"Availability"
    `;

    return rows.map((row) => row.categoryId);
  }

  const rows = await prisma.$queryRaw<Array<{ categoryId: string }>>`
    SELECT DISTINCT "categoryId"
    FROM (
      SELECT "categoryId"
      FROM "NewCar"
      WHERE "isDeleted" = false AND "status" = 'AVAILABLE'::"Availability"
      UNION
      SELECT "categoryId"
      FROM "OldCar"
      WHERE "isDeleted" = false AND "status" = 'AVAILABLE'::"Availability"
      UNION
      SELECT "categoryId"
      FROM "Property"
      WHERE "isDeleted" = false AND "status" = 'AVAILABLE'::"Availability"
      UNION
      SELECT "categoryId"
      FROM "OtherItem"
      WHERE "isDeleted" = false AND "status" = 'AVAILABLE'::"Availability"
    ) AS active_categories
  `;

  return rows.map((row) => row.categoryId);
};

const getLocalizedCategories = (
  categories: CategoryListItem[],
  isArabic: boolean,
) =>
  categories.map((category) => ({
    ...category,
    name: isArabic
      ? category.nameAr || category.nameEn || category.name
      : category.nameEn || category.name || category.nameAr,
  }));

const isRecoverableCategoryLookupError = (error: unknown) =>
  error instanceof RequestTimeoutError || isDatabaseUnavailableError(error);

const isItemType = (value: string): value is ItemType => {
  return Object.values(ItemType).includes(value as ItemType);
};

/**
 * @description Get category By params
 * @method GET
 * @route ~/api/categories?type=NEW_CAR&name=Sedan
 * @access public
 */

export async function GET(req: NextRequest) {
  const isArabic = resolveIsArabicFromRequest(req);
  try {
    const searchParams = req.nextUrl.searchParams;

    const name = searchParams.get("name");

    const type = searchParams.get("type");
    const withItemsOnlyParam = searchParams.get("withItemsOnly");
    const withItemsOnly =
      withItemsOnlyParam === "true" || withItemsOnlyParam === "1";
    const cacheKey = buildCategoryCacheKey({
      type,
      needle: name,
      withItemsOnly,
    });
    const cachedResponse = readCachedCategoryResult(cacheKey);

    if (cachedResponse) {
      return NextResponse.json({
        success: true,
        count: cachedResponse.totalCount,
        data: getLocalizedCategories(cachedResponse.categories, isArabic),
      });
    }

    void ensurePrismaConnection().catch(() => undefined);

    // ✅ شرط البحث الأساسي (يستثني الفئات المحذوفة)
    const whereClause: Prisma.CategoryWhereInput = {
      isDeleted: false,
    };

    const needle = name?.trim();

    // ✅ إذا تم تمرير type نضيف شرط المطابقة بالنوع
    if (type && type !== "ALL") {
      const normalizedType = type.trim().toUpperCase();
      if (!isItemType(normalizedType)) {
        return NextResponse.json(
          {
            success: false,
            error: localizeErrorMessage("Invalid category type", isArabic),
          },
          { status: 400 },
        );
      }
      // Used cars share categories with new cars — include both types
      if (normalizedType === ItemType.USED_CAR) {
        whereClause.type = { in: [ItemType.NEW_CAR, ItemType.USED_CAR] };
      } else {
        whereClause.type = normalizedType;
      }
    }

    const normalizedType =
      type && type !== "ALL" ? (type.trim().toUpperCase() as ItemType) : null;

    if (withItemsOnly) {
      const activeIdsCacheKey = normalizedType ?? "ALL";
      let activeCategoryIds = readCachedActiveCategoryIds(activeIdsCacheKey);

      if (!activeCategoryIds) {
        try {
          activeCategoryIds = await withTimeout(
            getDistinctCategoryIds(normalizedType),
            5000,
            "Category item lookup timed out",
          );
          writeCachedActiveCategoryIds(activeIdsCacheKey, activeCategoryIds);
        } catch (error) {
          const staleActiveCategoryIds = readCachedActiveCategoryIds(
            activeIdsCacheKey,
            true,
          );

          if (staleActiveCategoryIds?.length) {
            activeCategoryIds = staleActiveCategoryIds;
          } else if (isRecoverableCategoryLookupError(error)) {
            activeCategoryIds = null;
          } else {
            throw error;
          }
        }
      }

      if (activeCategoryIds && !activeCategoryIds.length) {
        return NextResponse.json({
          success: true,
          count: 0,
          data: [],
          message: localizeErrorMessage("No categories found", isArabic),
        });
      }

      if (activeCategoryIds?.length) {
        whereClause.id = {
          in: activeCategoryIds,
        };
      }
    }

    // ✅ البحث بالاسم (العربي/الإنكليزي) دون كسر باقي الشروط
    if (needle) {
      const currentAnd = Array.isArray(whereClause.AND)
        ? whereClause.AND
        : whereClause.AND
          ? [whereClause.AND]
          : [];

      whereClause.AND = [
        ...currentAnd,
        {
          OR: [
            { name: { contains: needle } },
            { nameAr: { contains: needle } },
            { nameEn: { contains: needle } },
          ],
        },
      ];
    }
    // ✅ جلب البيانات (كل الفئات إذا لم يُرسل أي name أو type)
    const categories = await withTimeout(
      prisma.category.findMany({
        where: whereClause,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          nameAr: true,
          nameEn: true,
          icon: true,
          type: true,
          isDeleted: true,
        },
      }),
      4500,
      "Category lookup timed out",
    );
    const totalCount = categories.length;

    // ✅ في حال عدم العثور على أي فئات
    if (!categories.length) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
        message: localizeErrorMessage("No categories found", isArabic),
      });
    }

    // ✅ النتيجة النهائية
    const localizedCategories = categories.map((category) => ({
      ...category,
      name: isArabic
        ? category.nameAr || category.nameEn || category.name
        : category.nameEn || category.name || category.nameAr,
    }));

    writeCachedCategoryResult(cacheKey, {
      categories,
      totalCount,
    });

    return NextResponse.json({
      success: true,
      count: totalCount,
      data: localizedCategories,
    });
  } catch (error) {
    const searchParams = req.nextUrl.searchParams;
    const staleFallback = readCachedCategoryResult(
      buildCategoryCacheKey({
        type: searchParams.get("type"),
        needle: searchParams.get("name"),
        withItemsOnly:
          searchParams.get("withItemsOnly") === "true" ||
          searchParams.get("withItemsOnly") === "1",
      }),
      true,
    );

    if (staleFallback && isRecoverableCategoryLookupError(error)) {
      return NextResponse.json({
        success: true,
        count: staleFallback.totalCount,
        data: getLocalizedCategories(staleFallback.categories, isArabic),
        stale: true,
      });
    }

    console.error("Error fetching categories:", error);
    return handleApiError(error, req);
  }
}
