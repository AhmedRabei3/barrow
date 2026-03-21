import { $Enums } from "@prisma/client";
import { FieldValues, useForm } from "react-hook-form";

export const useAddUsedCarForm = () => {
  return useForm<FieldValues>({
    mode: "onChange",
    defaultValues: {
      brand: "",
      model: "",
      year: 1990,
      color: "#000000",
      price: 100,
      categoryId: "",
      gearType: "AUTOMATIC",
      fuelType: "GASOLINE",
      description: "",
      rentType: null,
      sellOrRent: "RENT",
      latitude: 0,
      longitude: 0,
      city: "",
      address: "",
      state: "",
      country: "",
      mileage: 0,
      repainted: false,
      reAssembled: false,
    },
  });
};

export const useAddOtherForm = () => {
  return useForm<FieldValues>({
    mode: "onChange",
    defaultValues: {
      name: "",
      brand: "",
      description: "",
      price: 0,
      categoryId: "",
      sellOrRent: $Enums.TransactionType.SELL,
      rentType: "",
      latitude: 0,
      longitude: 0,
      address: "",
      city: "",
      state: "",
      country: "",
    },
  });
};

export const useAddNewCarForm = () => {
  return useForm<FieldValues>({
    mode: "onChange",
    defaultValues: {
      brand: "",
      model: "",
      year: 1990,
      color: "#000000",
      price: 100,
      categoryId: "",
      gearType: "AUTOMATIC",
      fuelType: "GASOLINE",
      description: "",
      rentType: "",
      sellOrRent: "SELL",
      status: "AVAILABLE",

      latitude: 0,
      longitude: 0,
      city: "",
      address: "",
      state: "",
      country: "",
    },
  });
};

export const useAddRealEstateForm = () => {
  return useForm<FieldValues>({
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      guests: 1,
      status: "AVAILABLE",
      direction: [],
      livingrooms: 1,
      bathrooms: 1,
      bedrooms: 1,
      kitchens: 1,
      floor: 0,
      area: 0,
      categoryId: "",
      petAllowed: false,
      furnished: false,
      elevator: false,
      sellOrRent: "RENT",
      rentType: null,
      latitude: 0,
      longitude: 0,
      address: "",
      city: "",
      state: "",
      country: "",
    },
  });
};

export const useAddForm = (itemType: $Enums.ItemType) => {
  const newCarForm = useAddNewCarForm();
  const usedCarForm = useAddUsedCarForm();
  const realEstateForm = useAddRealEstateForm();
  const otherForm = useAddOtherForm();

  switch (itemType) {
    case $Enums.ItemType.NEW_CAR:
      return newCarForm;
    case $Enums.ItemType.USED_CAR:
      return usedCarForm;
    case $Enums.ItemType.PROPERTY:
      return realEstateForm;
    default:
      return otherForm;
  }
};
