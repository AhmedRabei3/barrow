import { create } from "zustand";

export interface UsedCarModalData {
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
  reAssembled?: boolean;
  mileage?: number;
  repainted?: boolean;

  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;

}

interface UsedCarModal {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: UsedCarModalData;
  onOpen: (mode?: "create" | "edit", data?: UsedCarModalData) => void;
  onClose: () => void;
}

const useUsedCarModal = create<UsedCarModal>((set) => ({
  isOpen: false,
  mode: "create",
  initialData: undefined,
  onOpen: (mode = "create", data?: UsedCarModalData) =>
    set({ isOpen: true, mode, initialData: data }),
  onClose: () => set({ isOpen: false, mode: "create", initialData: undefined }),
}));

export default useUsedCarModal;
