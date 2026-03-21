"use client";

import { memo, useMemo, useState } from "react";
import QuestionContainer from "./Question";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import useItems from "@/app/hooks/useItem";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import { SEARCH_MODAL_TEXT } from "@/app/i18n/searchModal";

const CityCountrySelect = () => {
  const { isArabic } = useAppPreferences();
  const locale = isArabic ? "ar" : "en";
  const { filters, setFilters } = useSearchFilters();
  const { items } = useItems({ page: 1, limit: 1000 });

  const allCountriesValue = "__ALL__";
  const [country, setCountry] = useState(allCountriesValue);
  const [query, setQuery] = useState("");

  /**
   * استخراج الدول والمدن (مرة واحدة فقط)
   */
  const { countries, citiesByCountry } = useMemo(() => {
    const countrySet = new Set<string>();
    const map = new Map<string, Set<string>>();

    items.forEach((item) => {
      const loc = item.itemLocation?.[0];
      if (!loc?.city || !loc?.country) return;

      countrySet.add(loc.country);

      if (!map.has(loc.country)) {
        map.set(loc.country, new Set());
      }

      map.get(loc.country)!.add(loc.city);
    });

    return {
      countries: [allCountriesValue, ...Array.from(countrySet)],
      citiesByCountry: map,
    };
  }, [allCountriesValue, items]);

  /**
   * فلترة المدن حسب الدولة + البحث
   */
  const filteredCities = useMemo(() => {
    let cities: string[] = [];

    if (country === allCountriesValue) {
      cities = Array.from(
        new Set(
          Array.from(citiesByCountry.values()).flatMap((set) =>
            Array.from(set),
          ),
        ),
      );
    } else {
      cities = Array.from(citiesByCountry.get(country) || []);
    }

    if (!query) return cities;

    return cities.filter((c) => c.toLowerCase().includes(query.toLowerCase()));
  }, [allCountriesValue, citiesByCountry, country, query]);

  return (
    <QuestionContainer title={SEARCH_MODAL_TEXT.city[locale]}>
      <div className="space-y-2 w-full">
        {/* الدولة */}
        <label htmlFor="search-country" className="sr-only">
          {SEARCH_MODAL_TEXT.allCountries[locale]}
        </label>
        <select
          id="search-country"
          name="country"
          className="w-full p-2 border rounded"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            setQuery("");
          }}
        >
          {countries.map((c) => (
            <option key={c} value={c}>
              {c === allCountriesValue
                ? SEARCH_MODAL_TEXT.allCountries[locale]
                : c}
            </option>
          ))}
        </select>

        {/* البحث */}
        <label htmlFor="search-city-query" className="sr-only">
          {SEARCH_MODAL_TEXT.searchCity[locale]}
        </label>
        <input
          id="search-city-query"
          name="cityQuery"
          type="text"
          placeholder={SEARCH_MODAL_TEXT.searchCity[locale]}
          className="w-full p-2 border rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {/* المدن */}
        <div className="max-h-40 overflow-auto border rounded">
          {filteredCities.map((city) => (
            <button
              key={city}
              onClick={() =>
                setFilters({
                  city,
                })
              }
              className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                filters.city === city ? "bg-blue-100 font-medium" : ""
              }`}
            >
              {city}
            </button>
          ))}

          {filteredCities.length === 0 && (
            <div className="p-3 text-sm text-gray-400">
              {SEARCH_MODAL_TEXT.noCities[locale]}
            </div>
          )}
        </div>
      </div>
    </QuestionContainer>
  );
};

export default memo(CityCountrySelect);
