"use client";

import { memo, useEffect, useRef, useState, FC, Dispatch } from "react";
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

type CardItem = {
  item: {
    id?: string;
    type?: $Enums.ItemType | string | null;
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
  itemLocation: Array<{ state?: string | null } | null | undefined>;
  averageRating: number | null;
  totalReviews?: number;
  ownerId?: string | null;
};

interface CardProps {
  grandItem: GrandItem | FormattedItem | CardItem;
  setItemIdToEdit?: Dispatch<React.SetStateAction<string | null>>;
  setItemIdToDelete?: Dispatch<React.SetStateAction<string | null>>;
}

const Card: FC<CardProps> = ({
  grandItem,
  setItemIdToEdit,
  setItemIdToDelete,
}) => {
  const item = grandItem?.item;
  const itemImages = (grandItem?.itemImages ?? []).map((img) => ({
    url: img?.url ?? null,
  }));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const cardWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = cardWrapperRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // ✅ التبديل التلقائي بين الصور
  useEffect(() => {
    if (itemImages.length > 1 && !isPaused && isInView) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) =>
          prev === itemImages.length - 1 ? 0 : prev + 1,
        );
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [isPaused, isInView, itemImages.length]);

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
  const detailCardItem = {
    item,
    averageRating:
      "averageRating" in grandItem ? grandItem.averageRating : null,
    totalReviews: "totalReviews" in grandItem ? grandItem.totalReviews : 0,
    itemLocation: "itemLocation" in grandItem ? grandItem.itemLocation : [],
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

  const detailHref = item.id ? `items/details/${item.id}` : "#";
  const itemLabel = [brand, model].filter(Boolean).join(" ") || "listing";

  return (
    <div ref={cardWrapperRef} className="w-full h-full">
      <CardContainer setIsPaused={setIsPaused}>
        <Link
          href={detailHref}
          aria-label={`Open details for ${itemLabel}`}
          className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff385c]/60"
        />
        {/* ---------- الصورة الرئيسية ---------- */}
        <div
          className="
         relative w-full aspect-4/3
         overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900
         shadow-[0_8px_20px_rgba(15,23,42,0.08)]
         transition-shadow duration-300 group-hover:shadow-[0_12px_24px_rgba(15,23,42,0.16)]
         "
        >
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
        {/* ---------- تفاصيل العنصر ---------- */}
        <DetailCard grandItem={detailCardItem} />
      </CardContainer>
    </div>
  );
};

export default memo(Card);
