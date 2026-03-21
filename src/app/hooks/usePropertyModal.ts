import { create } from "zustand";

interface PropertyModal {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const usePropertyModal = create<PropertyModal>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default usePropertyModal;
