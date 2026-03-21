import { create } from "zustand";

interface ChatAssistantModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useChatAssistantModal = create<ChatAssistantModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default useChatAssistantModal;
