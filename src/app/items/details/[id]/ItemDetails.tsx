"use client";

import Map from "@/app/components/Map";
import GoBackBtn from "@/app/components/GoBackBtn";
import DetailImages from "./DetailImages";
import ElementPropereties from "./ElementPropereties";
import { memo } from "react";
import { $Enums } from "@prisma/client";
import ContactElement from "./ContactElement";
import RatingSection from "./RatingSection";

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
    };
    images: { url: string }[];
    reviews: {
      id: string;
      userId: string;
      rate: number;
      comment?: string | null;
    }[];
    transactions: unknown[];
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
  const { data, images, type, location, reviews } = item;
  console.log("data item detail :", data);
  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full relative">
      {/* 🔙 زر العودة */}
      <GoBackBtn />
      {/* 🖼️ الصور + التفاصيل */}
      <div className="flex-1 bg-sky-100 rounded-xl shadow-md p-3">
        <DetailImages images={images} />
        <ElementPropereties data={data} location={location} />
      </div>
      {/* 🗺️ الخريطة + الحجز */}
      <div className="flex-1 flex flex-col gap-4">
        {location?.latitude !== undefined &&
          location?.longitude !== undefined && (
            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-md bg-rose-100 p-2">
              <Map
                latitude={location?.latitude}
                longitude={location?.longitude}
                name={data?.brand || data?.title || data?.name}
              />
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
        <RatingSection
          itemId={data.id}
          itemType={type}
          reviews={reviews || []}
        />
      </div>
    </div>
  );
};

export default memo(ItemDetails);
