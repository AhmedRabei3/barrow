"use client";
import React, { Dispatch } from "react";
import CategoryDroper from "../usedCar/CategoryDroper";
import {
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { $Enums } from "@prisma/client";
import FormInput from "./FormInputs";
import NumberSelect from "../../NumberSelect";
import OptionsGroup from "../../OptionsGroup";
import SectionWrapper from "./SectionWrapper";

interface FormRealestateProps {
  categories: {
    id: string;
    name: string;
    type: $Enums.ItemType;
    icon: string | null;
  }[];
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  setSelectedImages: Dispatch<React.SetStateAction<File[]>>;
}

const FormRealestate = ({
  register,
  categories,
  watch,
  setValue,
}: FormRealestateProps) => {
  const radioGroups = [
    {
      name: "sellOrRent",
      label: "Sell / Rent",
      options: ["SELL", "RENT"],
      defaultValue: "RENT",
      iconName: "BiKey",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ---------------- SECTION 1 : BASIC INFO ---------------- */}
      <SectionWrapper title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CategoryDroper
            categories={categories}
            register={register}
            setValue={setValue}
            watch={watch}
          />

          <FormInput
            register={register}
            name="title"
            label="Title"
            required
            placeholder="Set a title"
            type="text"
          />

          <FormInput
            register={register}
            name="price"
            label="Price"
            required
            placeholder="Set price"
            type="number"
          />

          <OptionsGroup
            register={register}
            watch={watch}
            radioGroups={radioGroups}
          />
        </div>
      </SectionWrapper>

      {/* ---------------- SECTION 2 : PROPERTY FEATURES ---------------- */}
      <SectionWrapper title="Property Features">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-neutral-700">
          <div className="flex gap-2 items-center">
            <input id="furnished" type="checkbox" {...register("furnished")} />
            <label htmlFor="furnished">Furnished</label>
          </div>

          <div className="flex gap-2 items-center">
            <input id="pets" type="checkbox" {...register("pets")} />
            <label htmlFor="pets">Pets Allowed</label>
          </div>
        </div>
      </SectionWrapper>

      {/* ---------------- SECTION 3 : PROPERTY NUMBERS ---------------- */}
      <SectionWrapper title="Numbers & Rooms">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <NumberSelect
            name="guests"
            label="Guests"
            setValue={setValue}
            watch={watch}
            iconName="MdGroups"
          />

          <NumberSelect
            name="leavingRooms"
            label="Living Rooms"
            setValue={setValue}
            watch={watch}
            iconName="MdFamilyRestroom"
          />

          <NumberSelect
            name="bedrooms"
            label="Bedrooms"
            setValue={setValue}
            watch={watch}
            iconName="FaBed"
          />

          <NumberSelect
            name="bathrooms"
            label="Bathrooms"
            setValue={setValue}
            watch={watch}
            iconName="FaBath"
          />

          <NumberSelect
            name="kitchens"
            label="Kitchens"
            setValue={setValue}
            watch={watch}
            iconName="TbToolsKitchen2"
          />
        </div>
      </SectionWrapper>

      {/* ---------------- SECTION 4 : ADDITIONAL ADDRESS INFO ---------------- */}
      <SectionWrapper title="Address Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            register={register}
            name="address"
            label="Address"
            type="text"
            placeholder="Street & Number"
          />
          <FormInput register={register} name="city" label="City" type="text" />
          <FormInput
            register={register}
            name="state"
            label="State"
            type="text"
          />
          <FormInput
            register={register}
            name="country"
            label="Country"
            type="text"
          />
        </div>
      </SectionWrapper>
    </div>
  );
};

export default FormRealestate;
