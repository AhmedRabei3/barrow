import { $Enums } from "@prisma/client";
import { Dispatch, SetStateAction } from "react";
import {
  FieldErrors,
  FieldValues,
  UseFormGetValues,
  UseFormRegister,
  UseFormReset,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";

export interface AddNewCarProps {
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  reset: UseFormReset<FieldValues>;
  errors: FieldErrors<FieldValues>;
  categories: {
    id: string;
    name: string;
    type: $Enums.ItemType;
    icon: string | null;
  }[];
  setSelectedImages: Dispatch<SetStateAction<File[]>>;
  selectedImages?: File[];
  getValues?: UseFormGetValues<FieldValues>;
  isEditMode?: boolean;
  step?: number;
  setStep?: Dispatch<SetStateAction<number>>;
  trigger?: (name?: string | string[]) => Promise<boolean> | undefined;
}
