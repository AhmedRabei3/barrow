"use client";

import { create } from "zustand";
import { ItemType, TransactionType } from "@prisma/client";

interface Filters {
  type?: ItemType;
  catName: string;
  q: string;
  action: TransactionType;
  city: string;
  minPrice: string | number;
  maxPrice: string | number;
}

interface SearchState {
  filters: Filters;

  // actions
  setType: (type: ItemType | undefined) => void;
  setCatName: (name: string) => void;
  setQuery: (q: string) => void;
  setAction: (action: TransactionType) => void;
  setCity: (city: string) => void;
  setPrices: (min: string | number, max: string | number) => void;

  reset: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  filters: {
    type: undefined,
    catName: "",
    q: "",
    action: "SELL", // أو أي قيمة افتراضية
    city: "",
    minPrice: "",
    maxPrice: "",
  },

  setType: (type) =>
    set((state) => ({
      filters: { ...state.filters, type },
    })),

  setCatName: (catName) =>
    set((state) => ({
      filters: { ...state.filters, catName },
    })),

  setQuery: (q) =>
    set((state) => ({
      filters: { ...state.filters, q },
    })),

  setAction: (action) =>
    set((state) => ({
      filters: { ...state.filters, action },
    })),

  setCity: (city) =>
    set((state) => ({
      filters: { ...state.filters, city },
    })),

  setPrices: (min, max) =>
    set((state) => ({
      filters: { ...state.filters, minPrice: min, maxPrice: max },
    })),

  reset: () =>
    set({
      filters: {
        type: undefined,
        catName: "",
        q: "",
        action: "SELL",
        city: "",
        minPrice: "",
        maxPrice: "",
      },
    }),
}));
