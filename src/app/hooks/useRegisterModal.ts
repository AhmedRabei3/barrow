import { create } from "zustand";

interface RegisterModalStore {
  isOpen: boolean;
  referredBy?: string;
  onOpen: (refId?: string) => void;
  onClose: () => void;
  setReferrer: (refId: string) => void;
}

const useRegisterModal = create<RegisterModalStore>((set) => ({
  isOpen: false,
  referredBy: "",
  onOpen: (refId?: string) => set({ isOpen: true, referredBy: refId }),
  onClose: () => set({ isOpen: false }),
  setReferrer: (refId) => set({ referredBy: refId ? refId : undefined }),
}));

export default useRegisterModal;
