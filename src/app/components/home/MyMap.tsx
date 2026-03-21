"use client";

import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ComponentType,
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
} from "react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

type MappedItem = {
  id: string;
  name: string;
  image: string;
  latitude: number;
  longitude: number;
};

type RawItem = {
  item: {
    id: string;
    brand: string;
    model: string;
  };
  itemImages: Array<{ url?: string }>;
  itemLocation: Array<
    | {
        latitude: number;
        longitude: number;
        city?: string;
        country?: string;
        address?: string;
      }
    | null
    | undefined
  >;
};

interface MapClientProps {
  setShowMap: Dispatch<SetStateAction<boolean>>;
  items: MappedItem[];
}

interface MapProps {
  showMap: boolean;
  setShowMap: Dispatch<SetStateAction<boolean>>;
  items: RawItem[];
}

const DynamicMap = dynamic<MapClientProps>(
  () =>
    import("./MapClient.jsx").then(
      (mod) => mod.default as unknown as ComponentType<MapClientProps>,
    ),
  {
    ssr: false,
    loading: () => <div>Loading...</div>,
  },
);

const MapWrapper = ({ showMap, setShowMap, items }: MapProps) => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const mappedItems = useMemo(
    () =>
      items
        .filter(
          (i) =>
            i.itemLocation?.length &&
            typeof i.itemLocation[0]?.latitude === "number" &&
            typeof i.itemLocation[0]?.longitude === "number",
        )
        .map((i) => ({
          id: i.item.id ?? "",
          name: `${i.item.brand || i.item.model || t("عنصر", "Item")}`,
          image: i.itemImages[0]?.url || "/placeholder.jpg",
          latitude: i.itemLocation[0]?.latitude ?? 0,
          longitude: i.itemLocation[0]?.longitude ?? 0,
        })),
    [items, t],
  );

  return (
    <AnimatePresence>
      {showMap && <DynamicMap setShowMap={setShowMap} items={mappedItems} />}
    </AnimatePresence>
  );
};

export default MapWrapper;
