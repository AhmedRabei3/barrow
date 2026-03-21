"use client";

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css"; // ✅ هذا آمن لأن CSS لا يتضمن window
import type { LeafletMouseEvent } from "leaflet";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

interface MapProps {
  latitude: number;
  longitude: number;
  name?: string;
  // optional callback when user clicks on the map
  onMapClick?: (lat: number, lng: number) => void;
}

interface InternalMapProps extends MapProps {
  fallbackLabel: string;
}

// ✅ تحميل react-leaflet و leaflet فقط في المتصفح
const DynamicMap = dynamic(
  async () => {
    const L = await import("leaflet");
    const React = await import("react");
    const { MapContainer, TileLayer, Marker, Popup, useMapEvents } =
      await import("react-leaflet");

    // ✅ إصلاح أيقونة الماركر داخل المتصفح فقط
    type IconDefaultWithInternal = typeof L.Icon.Default & {
      prototype: { _getIconUrl?: string };
    };
    delete (L.Icon.Default as IconDefaultWithInternal).prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "/leaflet/marker-icon-2x.png",
      iconUrl: "/leaflet/marker-icon.png",
      shadowUrl: "/leaflet/marker-shadow.png",
    });

    return function LeafletMap({
      latitude,
      longitude,
      name,
      onMapClick,
      fallbackLabel,
    }: InternalMapProps) {
      const { useState } = React;

      function ClickableMap() {
        const [pos, setPos] = useState<[number, number]>([latitude, longitude]);

        useMapEvents({
          click(e: LeafletMouseEvent) {
            const { lat, lng } = e.latlng;
            setPos([lat, lng]);
            onMapClick?.(lat, lng);
          },
        });

        return (
          <>
            <Marker position={pos}>
              <Popup>{name || fallbackLabel}</Popup>
            </Marker>
          </>
        );
      }

      return (
        <MapContainer
          center={[latitude, longitude]}
          zoom={13}
          scrollWheelZoom={false}
          className="w-full h-full rounded-lg overflow-hidden"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <ClickableMap />
        </MapContainer>
      );
    };
  },
  {
    ssr: false, // ⛔ يمنع التنفيذ على السيرفر
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <p>...</p>
      </div>
    ),
  },
);

export default function Map(props: MapProps) {
  const { isArabic } = useAppPreferences();
  return (
    <DynamicMap
      {...props}
      fallbackLabel={isArabic ? "الموقع المحدد" : "Selected position"}
    />
  );
}
