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

interface ItemDetailsProps {
  item: {
    data: {
      id: string;
      brand?: string;
      title?: string;
      name?: string;
      model?: string;
      price?: number;
      status?: string;
      description?: string;
      sellOrRent?: string;
      rentType?: string;
      ownerId?: string | null;
      color?: string;
      fuelType?: string;
      gearType?: string;
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
    };
  };
}

const ItemDetails = ({ item }: ItemDetailsProps) => {
  const { data: session } = useSession();
  const { data, images, type, location, reviews } = item;
  const title = data?.title || data?.name || data?.brand || "Listing";
  const subtitle = [data?.model, location?.city, location?.country]
    .filter(Boolean)
    .join(" • ");
  const priceLabel = Number(data?.price ?? 0).toLocaleString("en-US");
  const isOwner = Boolean(data?.ownerId && session?.user?.id === data.ownerId);
  const manualRentalEndsAt = getManualRentalEndsAtFromTransactions(
    item.transactions,
    data.ownerId,
  );

  return (
    <div className="market-shell rounded-[28px] px-4 py-5 sm:px-6 lg:px-7 lg:py-7">
      <GoBackBtn />
      <div className="relative z-10 flex flex-col gap-6">
        <div className="market-panel rounded-[26px] px-5 py-5 sm:px-6">
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
                sellOrRent={data.sellOrRent}
                status={data.status}
                rentType={data.rentType}
                initialManualRentalEndsAt={manualRentalEndsAt}
                isOwner={isOwner}
                align="right"
                variant="hero"
              />
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/55 px-4 py-3 text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Price
                </p>
                <p className="mt-1 text-2xl font-black text-sky-300 sm:text-3xl">
                  ${priceLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="market-panel rounded-[26px] p-4 sm:p-5">
              <DetailImages images={images} />
            </div>
            <ElementPropereties data={data} type={type} location={location} />
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
                  </div>
                  <div className="overflow-hidden rounded-[22px] border border-slate-800/90 bg-slate-950/50 p-2">
                    <div className="aspect-16/10 overflow-hidden rounded-[18px]">
                      <Map
                        latitude={location?.latitude}
                        longitude={location?.longitude}
                        name={data?.brand || data?.title || data?.name}
                      />
                    </div>
                  </div>
                </div>
              )}
            <ContactElement
              itemType={type}
              data={{
                id: data.id,
                price: data.price ?? 0,
                status: data.status as
                  | import("@prisma/client").Availability
                  | undefined,
                title: data.title ?? data.name ?? data.brand,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ItemDetails);
