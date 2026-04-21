"use client";
import useSearchModal from "@/app/hooks/useSearchModal";
import Modal from "../Modal";
import SearchWizard from "./SearchWizard";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

const SearchModal = () => {
  const searchModal = useSearchModal();
  const { isArabic } = useAppPreferences();

  return (
    <div>
      <Modal
        title={isArabic ? "بحث متقدم" : "Advanced Search"}
        isOpen={searchModal.isOpen}
        onClose={searchModal.onClose}
        actionLabel={isArabic ? "بحث" : "Search"}
        disabled={false}
        body={<SearchWizard onFinish={searchModal.onClose} />}
      />
    </div>
  );
};

export default SearchModal;
