"use client";

import { useState } from "react";
import { FieldErrors, FieldValues, UseFormSetValue } from "react-hook-form";
import MapPicker from "./modals/mapPicker/MapPickerModal";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

interface LocationSelectorProps {
  setValue: UseFormSetValue<FieldValues>;
  errors: FieldErrors<FieldValues>;
}

const LocationSelector = ({ setValue, errors }: LocationSelectorProps) => {
  const { isArabic } = useAppPreferences();
  const [locationInfo, setLocationInfo] = useState({
    address: "",
    city: "",
    state: "",
    country: "",
  });

  return (
    <div>
      <div className="flex flex-col gap-2">
        <div className="">
          <p className="text-sm text-gray-700">
            {isArabic ? "اختر الموقع" : "Select Location"}
          </p>
          <MapPicker
            radius={1000}
            onLocationSelect={(loc) => {
              setValue("latitude", loc.lat, { shouldValidate: true });
              setValue("longitude", loc.lng, { shouldValidate: true });
              setValue("city", loc.city, { shouldValidate: true });
              setValue("address", loc.address, {
                shouldValidate: true,
              });
              setValue("state", loc.state);
              setValue("country", loc.country, {
                shouldValidate: true,
              });
              setLocationInfo(loc);
            }}
          />
        </div>

        {(errors.latitude || errors.longitude) && (
          <p className="text-red-500 text-xs mt-1">
            {isArabic ? "الموقع مطلوب" : "Location is required"}
          </p>
        )}

        <div className="mt-3 text-sm bg-gray-50 p-2 rounded border">
          <div className="flex justify-between sm:grid sm:grid-cols-2">
            <p>
              <b>{isArabic ? "المدينة:" : "City:"}</b> {locationInfo.city}
            </p>
            <p>
              <b>{isArabic ? "الولاية:" : "State:"}</b> {locationInfo.state}
            </p>
            <p>
              <b>{isArabic ? "الدولة:" : "Country:"}</b> {locationInfo.country}
            </p>
          </div>
          <p>
            <b>{isArabic ? "العنوان:" : "Address:"}</b> {locationInfo.address}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;
