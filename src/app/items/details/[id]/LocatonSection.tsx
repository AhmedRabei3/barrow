import { FaExternalLinkAlt, FaGoogle } from "react-icons/fa";
import Map from "@/app/components/Map";

interface LocationSectionProps {
  location: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    country?: string;
  } | null;
  subtitle: string | undefined;
  title: string;
  normalizedData: {
    brand?: string;
    title?: string;
    name?: string;
  };
  googleMapsUrl: string;
  isArabic: boolean;
}

const LocationSection = ({
  location,
  subtitle,
  title,
  normalizedData,
  googleMapsUrl,
  isArabic,
}: LocationSectionProps) => {
  return (
    <>
      {location?.latitude !== undefined &&
        location?.longitude !== undefined && (
          <div className="market-panel overflow-hidden rounded-[26px] p-3">
            <div className="mb-3 flex items-center justify-between px-2">
              <div>
                <p className="market-kicker">
                  {isArabic ? "الموقع" : "Location"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {location?.address || subtitle || title}
                </p>
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-100/90 px-3 py-2 text-xs font-semibold text-blue-800 transition hover:border-blue-600 hover:bg-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-sky-400 dark:hover:text-sky-200"
                aria-label="Open with Google Maps"
              >
                <FaGoogle className="text-sm" aria-hidden="true" />
                <span>
                  {isArabic
                    ? "فتح باستخدام خرائط غوغل"
                    : "Open with Google Maps"}
                </span>
                <FaExternalLinkAlt className="text-[10px]" aria-hidden="true" />
              </a>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-slate-300 bg-white/95 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-700/90 dark:bg-slate-950/70">
              <div className="aspect-16/10 overflow-hidden rounded-[18px]">
                <Map
                  latitude={location?.latitude}
                  longitude={location?.longitude}
                  name={
                    normalizedData.brand ||
                    normalizedData.title ||
                    normalizedData.name
                  }
                />
              </div>
            </div>
          </div>
        )}
    </>
  );
};

export default LocationSection;
