import { create } from "zustand";

interface AddOtherModal {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useAddOther = create<AddOtherModal>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default useAddOther;
