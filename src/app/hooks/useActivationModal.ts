import { create } from "zustand";

interface ActivationModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useActivationModal = create<ActivationModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default useActivationModal;
