"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./NearbyAlertsMap.css";
import { $Enums } from "@prisma/client";

type ListingAlert = {
  id: string;
  itemType: $Enums.ItemType | null;
  sellOrRent: $Enums.TransactionType | null;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  isEnabled: boolean;
  category?: {
    name?: string | null;
    nameAr?: string | null;
    nameEn?: string | null;
  } | null;
};

interface NearbyAlertsMapProps {
  alerts: ListingAlert[];
  selectedAlertId: string | null;
  draftPosition: [number, number] | null;
  isArabic: boolean;
  onPickDraftPosition: (lat: number, lng: number) => void;
  onSelectAlert: (alert: ListingAlert) => void;
  getAlertLabel: (alert: ListingAlert) => string;
}

const SYRIA_CENTER: [number, number] = [34.8021, 38.9968];

const makePin = (hex: string, size = 18) =>
  L.divIcon({
    className: "nearby-alert-pin",
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${hex};border:3px solid #fff;box-shadow:0 10px 22px rgba(15,23,42,0.3)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });

const savedPinIcon = makePin("#0f766e", 18);
const selectedPinIcon = makePin("#2563eb", 22);
const draftPinIcon = makePin("#f59e0b", 20);

function ClickToPick({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (event) => {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function FitMapView({
  alerts,
  selectedAlertId,
  draftPosition,
}: {
  alerts: ListingAlert[];
  selectedAlertId: string | null;
  draftPosition: [number, number] | null;
}) {
  const map = useMap();

  const target = useMemo(() => {
    if (draftPosition) return draftPosition;
    if (selectedAlertId) {
      const selected = alerts.find((alert) => alert.id === selectedAlertId);
      if (selected)
        return [selected.centerLat, selected.centerLng] as [number, number];
    }
    if (alerts.length > 0) {
      const first = alerts[0];
      return [first.centerLat, first.centerLng] as [number, number];
    }
    return SYRIA_CENTER;
  }, [alerts, draftPosition, selectedAlertId]);

  useEffect(() => {
    map.flyTo(target, alerts.length > 0 ? 10 : 6, {
      duration: 0.7,
    });
  }, [alerts.length, map, target]);

  return null;
}

export default function NearbyAlertsMap({
  alerts,
  selectedAlertId,
  draftPosition,
  isArabic,
  onPickDraftPosition,
  onSelectAlert,
  getAlertLabel,
}: NearbyAlertsMapProps) {
  const handleZoomToAlert = useCallback(
    (alert: ListingAlert) => {
      onSelectAlert(alert);
    },
    [onSelectAlert],
  );

  return (
    <div className="h-80 w-full overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
      <MapContainer
        center={SYRIA_CENTER}
        zoom={6}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ZoomControl position="bottomright" />

        <FitMapView
          alerts={alerts}
          selectedAlertId={selectedAlertId}
          draftPosition={draftPosition}
        />

        <ClickToPick onPick={onPickDraftPosition} />

        {alerts.map((alert) => {
          const isSelected = alert.id === selectedAlertId;
          return [
            <Marker
              key={`${alert.id}-marker`}
              position={[alert.centerLat, alert.centerLng]}
              icon={isSelected ? selectedPinIcon : savedPinIcon}
              eventHandlers={{
                click: () => handleZoomToAlert(alert),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -20]}
                permanent
                className="leaflet-tooltip-own"
                sticky
                opacity={1}
              >
                <span
                  className="block cursor-pointer select-none px-3 py-1.5 text-[11px] font-semibold transition-colors hover:bg-white hover:bg-opacity-20 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomToAlert(alert);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      handleZoomToAlert(alert);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  {getAlertLabel(alert)}
                </span>
              </Tooltip>
            </Marker>,
            <Circle
              key={`${alert.id}-radius`}
              center={[alert.centerLat, alert.centerLng]}
              radius={alert.radiusKm * 1000}
              pathOptions={{
                color: isSelected ? "#2563eb" : "#0f766e",
                fillColor: isSelected ? "#60a5fa" : "#34d399",
                fillOpacity: isSelected ? 0.16 : 0.1,
                weight: isSelected ? 2 : 1.5,
              }}
            />,
          ];
        })}

        {draftPosition && (
          <Marker
            position={draftPosition}
            icon={draftPinIcon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = event.target.getLatLng();
                onPickDraftPosition(lat, lng);
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -20]}
              permanent
              sticky
              opacity={1}
              className="leaflet-tooltip-own"
            >
              <span className="text-[11px] font-semibold px-3 py-1.5">
                {isArabic ? "الموقع الجديد" : "New location"}
              </span>
            </Tooltip>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
