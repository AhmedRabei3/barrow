"use client";

import Map from "@/app/components/Map";
import GoBackBtn from "@/app/components/GoBackBtn";
import DetailImages from "./DetailImages";
import ElementPropereties from "./ElementPropereties";
import { memo } from "react";
import { $Enums } from "@prisma/client";
import { useSession } from "next-auth/react";
import ContactElement from "./ContactElement";
import RatingSection from "./RatingSection";
import OwnerListingStateControl from "@/app/components/card/OwnerListingStateControl";
import { getManualRentalEndsAtFromTransactions } from "@/app/components/card/ownerListingState";
import { FaGoogle, FaExternalLinkAlt } from "react-icons/fa";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type ItemDetailsData = ItemDetailsProps["item"]["data"];

const normalizeItemDetailsData = (data: ItemDetailsData) => ({
  ...data,
  brand: data.brand ?? undefined,
  title: data.title ?? undefined,
  name: data.name ?? undefined,
  model: data.model ?? undefined,
  status: data.status ?? undefined,
  description: data.description ?? undefined,
  sellOrRent: data.sellOrRent ?? undefined,
  rentType: data.rentType ?? undefined,
  color: data.color ?? undefined,
  fuelType: data.fuelType ?? undefined,
  gearType: data.gearType ?? undefined,
});

interface ItemDetailsProps {
  item: {
    data: {
      id: string;
      brand?: string | null;
      title?: string | null;
      name?: string | null;
      model?: string | null;
      price?: number;
      status?: string | null;
      description?: string | null;
      sellOrRent?: string | null;
      rentType?: string | null;
      ownerId?: string | null;
      color?: string | null;
      fuelType?: string | null;
      gearType?: string | null;
      year?: number;
      mileage?: number;
      repainted?: boolean;
      reAssembled?: boolean;
      bedrooms?: number;
      bathrooms?: number;
      guests?: number;
      livingrooms?: number;
      kitchens?: number;
      area?: number;
      floor?: number;
      furnished?: boolean;
      petAllowed?: boolean;
      elvator?: boolean;
      direction?: string[];
    };
    images: { url: string }[];
    reviews: {
      id: string;
      userId: string;
      rate: number;
      comment?: string | null;
    }[];
    transactions: Array<{
      ownerId?: string | null;
      clientId?: string | null;
      type?: string | null;
      status?: string | null;
      payment?: unknown;
      endDate?: string | Date | null;
      createdAt?: string | Date | null;
    }>;
    type: $Enums.ItemType;
    location: {
      latitude: number;
      longitude: number;
      address: string;
      state: string;
      city: string;
      country: string;
    } | null;
  };
}

const ItemDetails = ({ item }: ItemDetailsProps) => {
  const { data: session } = useSession();
  const { isArabic } = useAppPreferences();
  const { data, images, type, location, reviews } = item;
  const normalizedData = normalizeItemDetailsData(data);
  const normalizedLocation = location ?? {
    latitude: 0,
    longitude: 0,
    address: "",
    state: "",
    city: "",
    country: "",
  };
  const title =
    normalizedData.title ||
    normalizedData.name ||
    normalizedData.brand ||
    "Listing";
  const subtitle = [normalizedData.model, location?.city, location?.country]
    .filter(Boolean)
    .join(" • ");
  const priceLabel = Number(normalizedData.price ?? 0).toLocaleString("en-US");
  const isOwner = Boolean(
    normalizedData.ownerId && session?.user?.id === normalizedData.ownerId,
  );
  const manualRentalEndsAt = getManualRentalEndsAtFromTransactions(
    item.transactions,
    normalizedData.ownerId,
  );
  const mapsQuery =
    location?.latitude !== undefined && location?.longitude !== undefined
      ? `${location.latitude},${location.longitude}`
      : (location?.address ?? subtitle ?? title);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <div className="market-shell rounded-[28px] border border-slate-200/70 bg-linear-to-br from-white/95 via-white to-slate-50/90 px-4 py-5 shadow-[0_24px_48px_rgba(15,23,42,0.1)] sm:px-6 lg:px-7 lg:py-7 dark:border-slate-700/70 dark:from-slate-900/95 dark:via-slate-900 dark:to-slate-950/95">
      <GoBackBtn />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="market-panel rounded-[26px] border border-slate-200/60 bg-linear-to-r from-slate-900/95 via-slate-900/90 to-slate-950/90 px-5 py-5 shadow-[0_16px_32px_rgba(15,23,42,0.35)] sm:px-6 dark:border-slate-700/80">
          <p className="market-kicker">Listing overview</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-[2.15rem]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm text-slate-400 sm:text-base">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <OwnerListingStateControl
                itemId={data.id}
                itemType={type}
                sellOrRent={normalizedData.sellOrRent}
                status={normalizedData.status}
                rentType={normalizedData.rentType}
                initialManualRentalEndsAt={manualRentalEndsAt}
                isOwner={isOwner}
                align="right"
                variant="hero"
              />
              <div
                className={`${isArabic ? "rtl" : "ltr"} rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3 text-right shadow-sm dark:border-slate-700 dark:bg-slate-950/55`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {isArabic ? "السعر" : "PRICE"}
                </p>
                <p className="mt-1 text-2xl font-black dark:text-sky-300 sm:text-3xl text-sky-500">
                  ${priceLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="market-panel rounded-[26px] border border-slate-200/70 bg-white/96 p-4 shadow-sm sm:p-5 dark:border-slate-700/80 dark:bg-slate-900/80">
              <DetailImages images={images} />
            </div>
            <ElementPropereties
              data={normalizedData}
              type={type}
              location={normalizedLocation}
            />
            <RatingSection
              itemId={data.id}
              itemType={type}
              reviews={reviews || []}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            {location?.latitude !== undefined &&
              location?.longitude !== undefined && (
                <div className="market-panel overflow-hidden rounded-[26px] p-3">
                  <div className="mb-3 flex items-center justify-between px-2">
                    <div>
                      <p className="market-kicker">Location</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {location?.address || subtitle || title}
                      </p>
                    </div>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        inline-flex items-center
                        gap-2 rounded-xl border 
                        border-slate-300 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700
                        shadow-sm transition hover:border-sky-500 hover:text-sky-600 dark:border-slate-700
                        dark:bg-slate-900/80 dark:text-slate-100 dark:hover:text-sky-300
                      "
                      aria-label="Open with Google Maps"
                    >
                      <FaGoogle className="text-sm" aria-hidden="true" />
                      <span>فتح باستخدام Google Maps </span>
                      <FaExternalLinkAlt
                        className="text-[10px]"
                        aria-hidden="true"
                      />
                    </a>
                  </div>
                  <div className="overflow-hidden rounded-[22px] border border-slate-800/90 bg-slate-950/50 p-2">
                    <div className="aspect-16/10 overflow-hidden rounded-[18px]">
                      <Map
                        latitude={location?.latitude}
                        longitude={location?.longitude}
                        name={
                          normalizedData.brand ||
                          normalizedData.title ||
                          normalizedData.name
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            <ContactElement
              itemType={type}
              data={{
                id: data.id,
                price: normalizedData.price ?? 0,
                status: normalizedData.status as
                  | import("@prisma/client").Availability
                  | undefined,
                title:
                  normalizedData.title ??
                  normalizedData.name ??
                  normalizedData.brand ??
                  undefined,
                sellOrRent: normalizedData.sellOrRent ?? undefined,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ItemDetails);
