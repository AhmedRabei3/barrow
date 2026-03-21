"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { CreateUsedCarInput } from "@/app/validations/usedCarValidations";

export type UsedCarFormValues = CreateUsedCarInput;

export const useCreateUsedCarForm = () => {
  const form = useForm<UsedCarFormValues>({
    defaultValues: {
      categoryId: "",
      brand: "",
      model: "",
      year: 1900,
      fuelType: "GASOLINE",
      gearType: "AUTOMATIC",
      sellOrRent: "RENT",
      rentType: "MONTHLY",
      price: 0,
      color: "#000000",
      mileage: 0,
      repainted: false,
      reAssembled: false,
      description: "",
      status: "AVAILABLE",
    },
    mode: "onTouched",
  });

  return useMemo(() => form, [form]);
};
