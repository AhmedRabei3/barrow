"use client";

import Map from "@/app/components/Map";
import GoBackBtn from "@/app/components/GoBackBtn";
import DetailImages from "./DetailImages";
import ElementPropereties from "./ElementPropereties";
import { memo } from "react";
import { useSession } from "next-auth/react";
import ContactElement from "./ContactElement";
import RatingSection from "./RatingSection";
import OwnerListingStateControl from "@/app/components/card/OwnerListingStateControl";
import { getManualRentalEndsAtFromTransactions } from "@/app/components/card/ownerListingState";
import { FaGoogle, FaExternalLinkAlt } from "react-icons/fa";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import type { ListingDetailsDto } from "@/server/services/listing-details.service";
import LocationSection from "./LocatonSection";

interface ItemDetailsProps {
  item: Pick<
    ListingDetailsDto,
    "data" | "images" | "reviews" | "transactions" | "type" | "location"
  >;
}

const ItemDetails = ({ item }: ItemDetailsProps) => {
  const { data: session } = useSession();
  const { isArabic } = useAppPreferences();
  const { data, images, type, location, reviews } = item;
  const normalizedData = {
    ...data,
    brand: data.brand ?? undefined,
    model: data.model ?? undefined,
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
    <div className="market-shell rounded-[28px] shadow-[0_24px_64px_rgba(15,23,42,0.2)] dark:shadow-[0_26px_70px_rgba(2,6,23,0.55)] sm:px-6 lg:px-7 lg:py-7">
      <GoBackBtn />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="market-panel rounded-[26px] border border-slate-200/60 bg-linear-to-r from-blue-600/95 via-sky-900/90 to-indigo-600 px-5 py-5 shadow-[0_16px_32px_rgba(15,23,42,0.35)] sm:px-6 dark:border-slate-700/80">
          <p className="market-kicker text-sky-200">Listing overview</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-sky-50 sm:text-3xl lg:text-[2.15rem]">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm text-blue-200 sm:text-base">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <OwnerListingStateControl
                itemId={data.id}
                itemType={type}
                sellOrRent={data.sellOrRent}
                status={data.status}
                rentType={data.rentType}
                initialManualRentalEndsAt={manualRentalEndsAt}
                isOwner={isOwner}
                align="right"
                variant="hero"
              />
              <div
                className={`${isArabic ? "rtl" : "ltr"} 
                  rounded-2xl 
                  border border-blue-300/80 bg-blue-50/95
                  px-4 py-3 text-right 
                  shadow-[0_14px_34px_rgba(30,64,175,0.16)]
                 dark:border-sky-500/35
                  dark:bg-slate-900/85 dark:shadow-[0_16px_34px_rgba(2,132,199,0.16)]`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-sky-300">
                  {isArabic ? "السعر" : "PRICE"}
                </p>
                <p className="mt-1 text-2xl font-black text-blue-800 dark:text-sky-100 sm:text-3xl">
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
            {location ? (
              <ElementPropereties
                data={normalizedData}
                type={type}
                location={location}
                isArabic={isArabic}
              />
            ) : null}
            <RatingSection
              itemId={data.id}
              itemType={type}
              reviews={reviews || []}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <LocationSection 
              location={location}
              subtitle={subtitle}
              title={title}
              normalizedData={normalizedData}
              googleMapsUrl={googleMapsUrl}
              isArabic={isArabic}
            />
            <ContactElement
              itemType={type}
              data={{
                id: data.id,
                price: data.price ?? 0,
                status: data.status as
                  | import("@prisma/client").Availability
                  | undefined,
                title: data.title ?? data.name ?? data.brand ?? undefined,
                sellOrRent: data.sellOrRent,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ItemDetails);
