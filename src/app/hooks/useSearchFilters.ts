import { create } from "zustand";
import { $Enums } from "@prisma/client";

export interface Filters {
  type?: $Enums.ItemType;
  catName: string;
  q: string;
  action?: $Enums.TransactionType;
  city: string;
  minPrice: string | number;
  maxPrice: string | number;
}

interface FiltersState {
  filters: Filters;
  setFilters: (newFilters: Partial<Filters>) => void;
  resetFilters: () => void;
}

export const useSearchFilters = create<FiltersState>((set) => ({
  filters: {
    type: undefined,
    catName: "All",
    q: "",
    action: undefined,
    city: "",
    minPrice: "",
    maxPrice: "",
  },

  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),

  resetFilters: () =>
    set({
      filters: {
        type: undefined,
        catName: "All",
        q: "",
        action: "RENT",
        city: "",
        minPrice: "",
        maxPrice: "",
      },
    }),
}));
