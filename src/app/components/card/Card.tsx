"use client";

import { memo, useEffect, useState, FC, Dispatch } from "react";
import Link from "next/link";
import ToolBox from "./ToolBox";
import LikeBtn from "./LikeBtn";
import Badges from "./Badges";
import DetailCard from "./DetailCard";
import PointsNavigation from "./PointsNavigation";
import ImageCard from "./ImageCard";
import CardContainer from "./CardContainer";
import { GrandItem } from "@/app/types/index";
import { FormattedItem } from "../home/getItems";
import { $Enums } from "@prisma/client";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { buildListingDetailsPath } from "@/lib/listingSeo";

type CardItem = {
  item: {
    id?: string;
    type?: $Enums.ItemType | string | null;
    name?: string | null;
    title?: string | null;
    brand?: string | null;
    model?: string | null;
    isNew?: boolean;
    isFeatured?: boolean;
    year?: number | null;
    price?: number | null;
    sellOrRent?: string | null;
    rentType?: string | null;
  };
  itemImages: Array<{ url?: string | null }>;
  itemLocation: Array<
    | { state?: string | null; city?: string | null; country?: string | null }
    | null
    | undefined
  >;
  averageRating: number | null;
  totalReviews?: number;
  ownerId?: string | null;
  moderationAction?: string | null;
  moderationNote?: string | null;
  moderatedAt?: string | null;
};

interface CardProps {
  grandItem: GrandItem | FormattedItem | CardItem;
  setItemIdToEdit?: Dispatch<React.SetStateAction<string | null>>;
  setItemIdToDelete?: Dispatch<React.SetStateAction<string | null>>;
  onStatusChanged?: () => Promise<void> | void;
}

const Card: FC<CardProps> = ({
  grandItem,
  setItemIdToEdit,
  setItemIdToDelete,
  onStatusChanged,
}) => {
  const { isArabic } = useAppPreferences();
  const item = grandItem?.item;
  const itemImages = (grandItem?.itemImages ?? []).map((img) => ({
    url: img?.url ?? null,
  }));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setIsPaused] = useState(false);
  const [isStateMenuOpen, setIsStateMenuOpen] = useState(false);

  useEffect(() => {
    if (currentIndex >= itemImages.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, itemImages.length]);

  if (!grandItem || !item) return <p>No item to preview</p>;

  const { brand, model } = item;
  const isNew = "isNew" in item ? item.isNew : false;
  const isFeatured = "isFeatured" in item ? item.isFeatured : false;
  const ownerId = "ownerId" in grandItem ? grandItem.ownerId : undefined;
  const isOwnerCard = Boolean(ownerId && setItemIdToDelete && setItemIdToEdit);
  const moderationAction =
    "moderationAction" in item ? item.moderationAction : undefined;
  const moderationNote =
    "moderationNote" in item ? item.moderationNote : undefined;
  const moderatedAt = "moderatedAt" in item ? item.moderatedAt : undefined;
  const status = "status" in item ? item.status : undefined;
  const seoItem = item as {
    id?: string;
    name?: string | null;
    brand?: string | null;
    model?: string | null;
  };
  const detailCardItem = {
    item,
    averageRating:
      "averageRating" in grandItem ? grandItem.averageRating : null,
    totalReviews: "totalReviews" in grandItem ? grandItem.totalReviews : 0,
    itemLocation:
      "itemLocation" in grandItem
        ? grandItem.itemLocation.map((location) => {
            const normalizedLocation = location as
              | {
                  state?: string | null;
                  city?: string | null;
                  address?: string | null;
                }
              | null
              | undefined;

            return normalizedLocation
              ? {
                  state: normalizedLocation.state ?? undefined,
                  city:
                    typeof normalizedLocation.city === "string"
                      ? normalizedLocation.city
                      : undefined,
                  address:
                    typeof normalizedLocation.address === "string"
                      ? normalizedLocation.address
                      : undefined,
                }
              : normalizedLocation;
          })
        : [],
  };

  const handleDotClick = (index: number) => setCurrentIndex(index);
  const itemType =
    ("category" in grandItem &&
      ((grandItem as GrandItem).category?.type as
        | "NEW_CAR"
        | "USED_CAR"
        | "PROPERTY"
        | "OTHER"
        | undefined)) ||
    (("type" in item ? item.type : undefined) as
      | "NEW_CAR"
      | "USED_CAR"
      | "PROPERTY"
      | "OTHER"
      | undefined);

  const primaryLocation = (detailCardItem.itemLocation[0] ?? undefined) as
    | { city?: string | null; country?: string | null }
    | undefined;
  const detailHref = seoItem.id
    ? buildListingDetailsPath({
        id: seoItem.id,
        name: seoItem.name,
        brand: seoItem.brand,
        model: seoItem.model,
        city: primaryLocation?.city,
        country: primaryLocation?.country,
      })
    : "#";
  const itemLabel = [brand, model].filter(Boolean).join(" ") || "listing";
  const moderationLabel =
    moderationAction === "REJECT"
      ? isArabic
        ? "مرفوض ويحتاج تعديل"
        : "Rejected and needs changes"
      : status === "PENDING_REVIEW"
        ? isArabic
          ? "بانتظار مراجعة الصور"
          : "Pending image review"
        : null;
  const moderationHint =
    moderationAction === "REJECT"
      ? moderationNote ||
        (isArabic
          ? "حدّث الصور حسب الملاحظة ثم أعد الحفظ أو الإرسال للمراجعة."
          : "Update the images based on the note, then save or resubmit for review.")
      : status === "PENDING_REVIEW"
        ? isArabic
          ? "إعلانك مخفي حاليًا ريثما تتم مراجعته من الإدارة."
          : "Your listing is hidden until review is completed by admin."
        : null;

  return (
    <div
      className="w-full h-fit mx-auto"
      style={{ contentVisibility: "auto", containIntrinsicSize: "560px" }}
    >
      <CardContainer setIsPaused={setIsPaused} isOverlayOpen={isStateMenuOpen}>
        <Link
          href={detailHref}
          prefetch={false}
          aria-label={`Open details for ${itemLabel}`}
          className="absolute inset-0 z-10 rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        />
        <div className="relative w-full aspect-4/3 overflow-hidden rounded-t-[20px] dark:bg-slate-950/60">
          {/* ❤️ زر الإعجاب */}
          <LikeBtn itemId={item.id} itemType={itemType ?? null} />
          {/* صندوق الأدوات */}
          {item.id &&
            ownerId &&
            itemType &&
            setItemIdToDelete &&
            setItemIdToEdit && (
              <ToolBox
                setItemIdToDelete={setItemIdToDelete}
                setItemIdToEdit={setItemIdToEdit}
                itemId={item.id}
                itemType={itemType}
                currentStatus={typeof status === "string" ? status : null}
                onStatusChanged={onStatusChanged}
              />
            )}
          {/* ✅ عرض صورة واحدة بتأثير Fade */}
          <ImageCard
            itemImages={itemImages}
            currentIndex={currentIndex}
            brand={brand}
            model={model}
          />

          {/* نقاط التبديل بين الصور */}
          <PointsNavigation
            itemImages={itemImages}
            currentIndex={currentIndex}
            handleDotClick={handleDotClick}
          />
          {/* Badges */}
          <Badges isFeatured={isFeatured} isNew={isNew} />
        </div>
        {isOwnerCard && moderationLabel && moderationHint ? (
          <div className="mx-4 mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
            <div className="font-semibold">{moderationLabel}</div>
            <div className="mt-1 leading-5">{moderationHint}</div>
            {moderatedAt ? (
              <div className="mt-1 text-[11px] text-amber-200/80">
                {isArabic ? "آخر تحديث:" : "Last update:"}{" "}
                {new Date(moderatedAt).toLocaleString(
                  isArabic ? "ar" : "en-US",
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <DetailCard
          grandItem={detailCardItem}
          itemType={itemType}
          isOwnerCard={isOwnerCard}
          onStatusChanged={onStatusChanged}
          onMenuOpenChange={setIsStateMenuOpen}
        />
      </CardContainer>
    </div>
  );
};

export default memo(Card);
