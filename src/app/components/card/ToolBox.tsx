"use client";

import { Dispatch, memo, useState } from "react";
import { BsFillGearFill } from "react-icons/bs";
import { FaRegEdit, FaRegTrashAlt, FaRegStar } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { $Enums } from "@prisma/client";

interface ToolBoxProps {
  setItemIdToEdit: Dispatch<React.SetStateAction<string | null>>;
  setItemIdToDelete: Dispatch<React.SetStateAction<string | null>>;
  itemId: string;
  itemType: $Enums.ItemType;
}

function ToolBox({
  setItemIdToEdit,
  setItemIdToDelete,
  itemId,
  itemType,
}: ToolBoxProps) {
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  const handleGearClick = () => {
    setChecked((prev) => !prev);
  };

  const handleDeleteClick = () => {
    setChecked(false);
    setItemIdToDelete(itemId);
  };

  const handleEditClick = () => {
    setChecked(false);
    setItemIdToEdit(itemId);
  };

  const handleFeatureClick = () => {
    setChecked(false);
    const params = new URLSearchParams({
      service: "FEATURED_AD",
      itemId,
      itemType,
    });
    router.push(`/payment?${params.toString()}`);
  };

  return (
    <div dir="ltr" className="absolute top-2 left-2 p-0.5 z-30 w-fit">
      <div
        onClick={handleGearClick}
        className="
        flex items-center relative 
        p-1 text-gray-800 text-sm
       "
      >
        {/* أيقونة المسنن مع حركة */}
        <BsFillGearFill
          style={{
            transition: "transform 0.5s ease",
            color: "white",
            transform: checked
              ? "rotate(0deg) scale(1.5)"
              : "rotate(90deg) scale(1.5)",
          }}
          className="cursor-pointer hover:shadow-lg bg-black/40 rounded-full p-0.2 relative z-999"
        />

        {/* الأيقونات المنبثقة مع stagger effect */}
        <div className="flex gap-3 ml-3">
          <FaRegStar
            onClick={handleFeatureClick}
            style={{
              transition: "all 0.5s ease",
              transitionDelay: checked ? "0.35s" : "0s",
              transform: checked ? "translateX(0)" : "translateX(-20px)",
              opacity: checked ? 1 : 0,
            }}
            className={`
            text-white
            bg-amber-500/80
            hover:bg-amber-600
            text-xl
            p-0.5 rounded
            cursor-pointer
            ${checked ? "pointer-events-auto" : "pointer-events-none"}
            `}
          />
          <FaRegTrashAlt
            onClick={handleDeleteClick}
            style={{
              transition: "all 0.5s ease",
              transitionDelay: checked ? "0.25s" : "0s",
              transform: checked ? "translateX(0)" : "translateX(-20px)",
              opacity: checked ? 1 : 0,
            }}
            className={`
            text-white
            hover:bg-red-700
            text-xl
            p-0.5 rounded
            cursor-pointer
            bg-red-600/70
            ${checked ? "pointer-events-auto" : "pointer-events-none"}
            `}
          />
          <FaRegEdit
            onClick={handleEditClick}
            style={{
              transition: "all 0.5s ease",
              transitionDelay: checked ? "0.1s" : "0s",
              transform: checked ? "translateX(0)" : "translateX(-20px)",
              opacity: checked ? 1 : 0,
            }}
            className={`
            text-white
            bg-emerald-600/70
            hover:scale-105
            hover:bg-emerald-700
            p-0.5 rounded
            cursor-pointer
            text-xl
            ${checked ? "pointer-events-auto" : "pointer-events-none"}
            `}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(ToolBox);
