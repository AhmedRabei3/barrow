import { create } from "zustand";

export interface PaymentPasswordModalData {
  id: 1;
  password: string | null;
}

interface PaymentPasswordModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: PaymentPasswordModalData;
  onOpen: (mode?: "create" | "edit", data?: PaymentPasswordModalData) => void;
  onClose: () => void;
}

const usePaymentPasswordModal = create<PaymentPasswordModalState>((set) => ({
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

export default usePaymentPasswordModal;
