"use client";

import dynamic from "next/dynamic";

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

const MapPickerLeaflet = dynamic<MapPickerProps>(
  // @ts-expect-error Next resolves the client-only module without a source extension.
  () => import("./MapPickerLeaflet").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="h-62.5 w-full rounded bg-slate-100" />,
  },
);

export default function MapPicker(props: MapPickerProps) {
  return <MapPickerLeaflet {...props} />;
}
