import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CardList from "@/app/components/home/CardList";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import {
  buildCategoryLandingPath,
  buildListingDetailsPath,
  getItemTypeFromSegment,
  ITEM_TYPE_LABELS,
} from "@/lib/listingSeo";
import { prisma } from "@/lib/prisma";
import type { ItemSearchItemDto } from "@/features/items/types";
import { searchItems } from "@/server/services/item-search.service";

interface PageProps {
  params: Promise<{
    typeSegment: string;
    categoryId: string;
    slug: string;
  }>;
}

const PAGE_LIMIT = 24;

const formatCategoryItems = (items: ItemSearchItemDto[]) =>
  items.map((item) => ({
    item: {
      id: item.id,
      type: item.type ?? item.category?.type,
      name: item.name ?? "",
      brand: item.brand ?? item.title ?? "",
      model: item.model ?? "",
      year: item.year,
      price: item.price ?? 0,
      sellOrRent: item.sellOrRent ?? "SELL",
      rentType: item.rentType ?? null,
      isFeatured: Boolean(item.isFeatured),
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      guests: item.guests,
      livingrooms: item.livingrooms,
      kitchens: item.kitchens,
      area: item.area,
      floor: item.floor,
      furnished: item.furnished,
      petAllowed: item.petAllowed,
      elvator: item.elvator,
      color: item.color ?? undefined,
      fuelType: item.fuelType ?? undefined,
      gearType: item.gearType ?? undefined,
      mileage: item.mileage,
      repainted: item.repainted,
      reAssembled: item.reAssembled,
    },
    itemImages: item.images ?? [],
    itemLocation: item.location ? [item.location] : [],
    category: item.category ?? undefined,
    totalReviews: item.reviewsCount ?? 0,
    averageRating: item.averageRating ?? 0,
  }));

const getCategoryLandingData = async (typeSegment: string, categoryId: string) => {
  const itemType = getItemTypeFromSegment(typeSegment);
  if (!itemType) {
    return null;
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      type: itemType,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      nameAr: true,
      nameEn: true,
      type: true,
    },
  });

  if (!category) {
    return null;
  }

  const itemsResponse = await searchItems({
    q: "",
    type: category.type,
    catName: category.name,
    userLat: null,
    userLng: null,
    page: 1,
    limit: PAGE_LIMIT,
  });

  return {
    category,
    items: itemsResponse.items,
    totalCount: itemsResponse.totalCount,
    canonicalPath: buildCategoryLandingPath({
      type: category.type,
      categoryId: category.id,
      categoryName: category.name,
    }),
  };
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { typeSegment, categoryId } = await params;
  const data = await getCategoryLandingData(typeSegment, categoryId);

  if (!data) {
    return {
      title: "Category not found",
      robots: { index: false, follow: false },
    };
  }

  const label = ITEM_TYPE_LABELS[data.category.type].en;
  const title = `${data.category.name} ${label} | ${SITE_NAME}`;
  const description = `Browse ${data.totalCount} active ${label.toLowerCase()} listings in ${data.category.name} on ${SITE_NAME}. Explore prices, photos, and marketplace details.`;

  return {
    title,
    description,
    alternates: {
      canonical: data.canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(data.canonicalPath),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function CategoryLandingPage({ params }: PageProps) {
  const { typeSegment, categoryId, slug } = await params;
  const data = await getCategoryLandingData(typeSegment, categoryId);

  if (!data) {
    notFound();
  }

  const canonicalSlug = data.canonicalPath.split("/").pop();
  if (canonicalSlug && canonicalSlug !== slug) {
    redirect(data.canonicalPath);
  }

  const typeLabel = ITEM_TYPE_LABELS[data.category.type];
  const cards = formatCategoryItems(data.items);
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${data.category.name} ${typeLabel.en}`,
    url: absoluteUrl(data.canonicalPath),
    description: `Browse ${data.totalCount} listings in ${data.category.name}.`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: data.items.slice(0, 12).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(
          buildListingDetailsPath({
            id: item.id,
            title: item.title,
            name: item.name,
            brand: item.brand,
            model: item.model,
            city: item.location?.city,
            country: item.location?.country,
          }),
        ),
        name: item.brand ?? item.title ?? item.name ?? "Listing",
      })),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: typeLabel.en,
          item: absoluteUrl(`/categories/${typeSegment}`),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: data.category.name,
          item: absoluteUrl(data.canonicalPath),
        },
      ],
    },
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <nav className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/" className="hover:text-sky-500">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span>{typeLabel.en}</span>
        <span className="mx-2">/</span>
        <span className="text-slate-900 dark:text-white">{data.category.name}</span>
      </nav>
      <header className="mb-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
          {typeLabel.en}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          {data.category.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Explore {data.totalCount} active listings in {data.category.name}. This landing page is optimized for browsing current offers, comparing photos and pricing, and reaching the most relevant inventory faster.
        </p>
      </header>
      {cards.length > 0 ? (
        <CardList items={cards} />
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No active listings are available in this category yet.
        </div>
      )}
    </main>
  );
}