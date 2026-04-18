"use client";

import { FaMapMarkedAlt } from "react-icons/fa";
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
      <FaMapMarkedAlt size={24} />
    </button>
  );
};

export default MapButton;
