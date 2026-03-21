import { create } from "zustand";

export interface CarModalData {
  id?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  price?: number;
  description?: string;
  categoryId?: string;
  gearType?: string;
  fuelType?: string;
  sellOrRent?: string;
  rentType?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface AddCarModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: CarModalData;
  onOpen: (mode?: "create" | "edit", data?: CarModalData) => void;
  onClose: () => void;
}

const useAddCarModal = create<AddCarModalState>((set) => ({
  isOpen: false,
  mode: "create",
  initialData: undefined,
  onOpen: (mode = "create", data) =>
    set({
      isOpen: true,
      mode,
      initialData: data,
    }),
  onClose: () =>
    set({
      isOpen: false,
      mode: "create",
      initialData: undefined,
    }),
}));

export default useAddCarModal;
