"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const FitBounds = ({ items }) => {
  const map = useMap();

  useEffect(() => {
    if (items.length) {
      const bounds = L.latLngBounds(
        items.map((i) => [i.latitude, i.longitude]),
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [items, map]);

  return null;
};

const MapClient = ({ setShowMap, items }) => {
  const router = useRouter();
  const { isArabic } = useAppPreferences();
  const t = (ar, en) => (isArabic ? ar : en);

  const customIcon = new L.Icon({
    iconUrl: "/leaflet/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "/leaflet/marker-shadow.png",
    shadowSize: [41, 41],
  });

  return (
    <div className="fixed inset-0 z-50 bg-white/95">
      <button
        onClick={() => setShowMap(false)}
        aria-label={t("إغلاق الخريطة", "Close map")}
        className="absolute top-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded shadow-lg"
      >
        {t("إغلاق الخريطة", "Close map")}
      </button>

      <MapContainer
        center={[0, 0]}
        zoom={13}
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <FitBounds items={items} />

        {items.map((item) => (
          <Marker
            key={item.id}
            position={[item.latitude, item.longitude]}
            icon={customIcon}
          >
            <Popup>
              <div
                className="cursor-pointer"
                onClick={() => router.push(`/items/details/${item.id}`)}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-16 object-cover rounded mb-1"
                />
                <div className="text-sm font-semibold">{item.name}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapClient;
