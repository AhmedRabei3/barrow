import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ItemType, Prisma } from "@prisma/client";
import {
  localizeErrorMessage,
  resolveIsArabicFromRequest,
} from "@/app/i18n/errorMessages";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { withTimeout } from "@/app/api/lib/errors/dbGuard";

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

    const activeItemsFilter = {
      some: {
        isDeleted: false,
        status: "AVAILABLE" as const,
      },
    };

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

      if (withItemsOnly) {
        if (normalizedType === ItemType.NEW_CAR) {
          whereClause.newCars = activeItemsFilter;
        }
        if (normalizedType === ItemType.USED_CAR) {
          whereClause.oldCars = activeItemsFilter;
        }
        if (normalizedType === ItemType.PROPERTY) {
          whereClause.properties = activeItemsFilter;
        }
        if (normalizedType === ItemType.OTHER) {
          whereClause.otherItems = activeItemsFilter;
        }
      }
    } else if (withItemsOnly) {
      whereClause.OR = [
        { newCars: activeItemsFilter },
        { oldCars: activeItemsFilter },
        { properties: activeItemsFilter },
        { otherItems: activeItemsFilter },
      ];
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
    const [categories, totalCount] = await withTimeout(
      Promise.all([
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
        prisma.category.count({
          where: whereClause,
        }),
      ]),
      5000,
      "Category lookup timed out",
    );

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

    return NextResponse.json({
      success: true,
      count: totalCount,
      data: localizedCategories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return handleApiError(error, req);
  }
}
