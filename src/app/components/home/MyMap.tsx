"use client";

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
  city?: string;
  country?: string;
  address?: string;
  price?: number;
  isFeatured?: boolean;
};

type RawItem = {
  item: {
    id: string;
    name?: string;
    brand: string;
    model: string;
    price?: number;
    isFeatured?: boolean;
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
  promptForLocationSelection?: boolean;
}

interface MapProps {
  showMap: boolean;
  setShowMap: Dispatch<SetStateAction<boolean>>;
  items: RawItem[];
  promptForLocationSelection?: boolean;
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

const MapWrapper = ({
  showMap,
  setShowMap,
  items,
  promptForLocationSelection = false,
}: MapProps) => {
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
          name:
            i.item.name || i.item.brand || i.item.model || t("عنصر", "Item"),
          image: i.itemImages[0]?.url || "/placeholder.jpg",
          latitude: i.itemLocation[0]?.latitude ?? 0,
          longitude: i.itemLocation[0]?.longitude ?? 0,
          city: i.itemLocation[0]?.city,
          country: i.itemLocation[0]?.country,
          address: i.itemLocation[0]?.address,
          price: i.item.price,
          isFeatured: Boolean(i.item.isFeatured),
        })),
    [items, t],
  );

  return showMap ? (
    <DynamicMap
      setShowMap={setShowMap}
      items={mappedItems}
      promptForLocationSelection={promptForLocationSelection}
    />
  ) : null;
};

export default MapWrapper;
