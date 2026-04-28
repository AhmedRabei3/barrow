"use client";

import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface MapButtonProps {
  showMap: boolean;
  setShowMap: React.Dispatch<React.SetStateAction<boolean>>;
}

const MapButton = ({ showMap, setShowMap }: MapButtonProps) => {
  const { isArabic } = useAppPreferences();
  return (
    <button
      onClick={() => setShowMap((prev) => !prev)}
      aria-pressed={showMap}
      aria-label={isArabic ? "تبديل عرض الخريطة" : "Toggle map view"}
      className="
         fixed bottom-6 right-6 z-40
         rounded-full p-3.5
         bg-blue/72 bg-blue-600/72 text-slate-100
         border border-white/70 backdrop-blur-md
         shadow-md hover:shadow-lg hover:bg-blue/85 hover:bg-blue-900/85
         transition-all duration-300
        "
      title={isArabic ? "عرض الخريطة" : "Show map"}
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9 2.5a1 1 0 0 1 .38.08L15 4.83l4.62-2.31A1 1 0 0 1 21 3.4v15.2a1 1 0 0 1-.55.9l-5 2.5a1 1 0 0 1-.9 0L9 19.67l-4.55 2.28A1 1 0 0 1 3 21.1V5.9a1 1 0 0 1 .55-.9l5-2.5A1 1 0 0 1 9 2.5Zm1 2.67v12.9l4 1.6V6.77l-4-1.6Zm-2 .03-3 1.5v12.68l3-1.5V5.2Zm8 1.57v12.9l3-1.5V5.27l-3 1.5Z" />
      </svg>
    </button>
  );
};

export default MapButton;
