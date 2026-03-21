import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaChevronDown } from "react-icons/fa";
import h from "@/app/hooks";
import { DynamicIcon } from "../../addCategory/IconSetter";
import {
  FieldValues,
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
} from "react-hook-form";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

type CategoryOption = {
  id: string;
  name: string;
  icon: string | null;
};

interface CategoryDropdownProps {
  categories: CategoryOption[];
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

const CategoryDropdown = ({
  categories,
  register,
  watch,
  setValue,
}: CategoryDropdownProps) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [open, setOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  h.useClickOutside(dropdownRef, () => setOpen(false));

  // ✅ استخدام watch لمراقبة قيمة الفئة المختارة
  const selectedCategoryId = watch("categoryId");
  const selected = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="flex flex-col flex-3 relative mb-2" ref={dropdownRef}>
      <label className="block text-sm font-medium text-neutral-700">
        {t("التصنيف", "Category")}
      </label>
      <input type="hidden" {...register("categoryId", { required: true })} />
      {/* زر القائمة */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="
         w-full px-3 py-1
         border rounded-md bg-white 
         flex items-center justify-between
       hover:bg-neutral-50
        "
      >
        <span className="text-sm">
          {selected ? selected.name : t("التصنيف", "Category")}
        </span>
        <FaChevronDown
          className={`transition ${open ? "rotate-180" : ""}`}
          size={14}
        />
      </button>

      {/* القائمة المنسدلة */}
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, scale: 0.97, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -5 }}
            transition={{ duration: 0.15 }}
            className="
              mt-1 bg-white border 
              rounded-md shadow-lg absolute 
              z-50 w-full overflow-y-auto 
              overflow-x-hidden
            "
          >
            {categories.map((c) => (
              <motion.li
                key={c.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setValue("categoryId", c.id, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                  setOpen(false);
                }}
                className="
                  px-2 py-1 cursor-pointer 
                  text-sm hover:bg-sky-100 
                  flex items-center gap-2
                "
              >
                {c?.icon && <DynamicIcon iconName={c.icon} />}
                {c.name}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoryDropdown;
