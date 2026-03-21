"use client";
import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [34.8021, 38.9968];

interface MapPickerProps {
  onLocationSelect: (data: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    state: string;
    country: string;
  }) => void;
  radius?: number;
  initialCenter?: [number, number];
}

const markerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [35, 35],
});

type LocationPayload = {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  country: string;
};

const reverseGeocode = async (
  lat: number,
  lng: number,
): Promise<LocationPayload> => {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
    const json = await res.json();

    if (!res.ok || !json?.success) {
      return {
        lat,
        lng,
        address: "",
        city: "",
        state: "",
        country: "",
      };
    }

    const addr = json.address || {};
    const address = json.display_name || "";
    const city = addr.city || addr.town || addr.village || "";
    const state = addr.state || "";
    const country = addr.country || "";

    return { lat, lng, address, city, state, country };
  } catch (err) {
    console.error("Reverse geocoding (client) failed", err);
    return {
      lat,
      lng,
      address: "",
      city: "",
      state: "",
      country: "",
    };
  }
};

interface InteractiveMapProps {
  onLocationSelect: MapPickerProps["onLocationSelect"];
  radius?: number;
  position: [number, number] | null;
  setPosition: React.Dispatch<React.SetStateAction<[number, number] | null>>;
}

function ClickableMap({
  onLocationSelect,
  radius,
  position,
  setPosition,
}: InteractiveMapProps) {
  const map = useMap();

  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      if (radius) map.flyTo(e.latlng, 13);

      const location = await reverseGeocode(lat, lng);
      onLocationSelect(location);
    },
  });

  return (
    <>
      {position && <Marker position={position} icon={markerIcon} />}
      {position && radius && (
        <Circle
          center={position}
          radius={radius}
          pathOptions={{ fillOpacity: 0.2 }}
        />
      )}
    </>
  );
}

function LocateMe({ onLocationSelect, setPosition }: InteractiveMapProps) {
  const map = useMap();

  return (
    <button
      onClick={() => {
        map.once("locationfound", async (e) => {
          const { lat, lng } = e.latlng;
          setPosition([lat, lng]);
          map.flyTo(e.latlng, 14);

          const location = await reverseGeocode(lat, lng);
          onLocationSelect(location);
        });

        map.once("locationerror", () => {
          console.warn("Unable to detect current location");
        });

        map.locate({ enableHighAccuracy: true, setView: true, maxZoom: 14 });
      }}
      className="absolute z-999 top-3 right-3 bg-white p-2 rounded shadow-md"
    >
      My location
    </button>
  );
}

function SearchControl() {
  const map = useMap();

  const searchCity = async (city: string) => {
    if (!city) return;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${city}`,
    );
    const data = await res.json();
    if (data[0]) {
      map.flyTo([data[0].lat, data[0].lon], 12);
    }
  };

  return (
    <input
      placeholder="ابحث عن مدينة..."
      className="absolute z-999 top-3 left-3 bg-white p-2 rounded shadow-md w-40"
      onKeyDown={(e) => {
        if (e.key === "Enter") searchCity((e.target as HTMLInputElement).value);
      }}
    />
  );
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

export default function MapPicker({
  onLocationSelect,
  radius = 1000,
  initialCenter,
}: MapPickerProps) {
  const center = initialCenter || DEFAULT_CENTER;
  const [position, setPosition] = useState<[number, number] | null>(null);

  return (
    <div className="relative h-62.5 w-full rounded overflow-hidden">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SearchControl />
        <RecenterMap center={center} />
        <LocateMe
          onLocationSelect={onLocationSelect}
          radius={radius}
          position={position}
          setPosition={setPosition}
        />
        <ClickableMap
          onLocationSelect={onLocationSelect}
          radius={radius}
          position={position}
          setPosition={setPosition}
        />
      </MapContainer>
    </div>
  );
}
