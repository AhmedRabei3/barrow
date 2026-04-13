"use client";

import { Dispatch, memo, useState } from "react";
import { BsFillGearFill } from "react-icons/bs";
import { FaRegEdit, FaRegTrashAlt } from "react-icons/fa";
import { $Enums } from "@prisma/client";

interface ToolBoxProps {
  setItemIdToEdit: Dispatch<React.SetStateAction<string | null>>;
  setItemIdToDelete: Dispatch<React.SetStateAction<string | null>>;
  itemId: string;
  itemType: $Enums.ItemType;
  currentStatus?: string | null;
  onStatusChanged?: () => Promise<void> | void;
}

function ToolBox({ setItemIdToEdit, setItemIdToDelete, itemId }: ToolBoxProps) {
  const [checked, setChecked] = useState(false);

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

  return (
    <div dir="ltr" className="absolute top-2 left-2 p-0.5 z-30 w-fit">
      <div
        onClick={handleGearClick}
        className="relative flex items-center p-1 text-sm text-gray-800"
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
          className="relative z-999 cursor-pointer rounded-full bg-slate-950/82 p-1 shadow-lg ring-1 ring-white/10 backdrop-blur-md"
        />

        {/* الأيقونات المنبثقة مع stagger effect */}
        <div className="relative ml-3 flex gap-3">
          <FaRegTrashAlt
            onClick={handleDeleteClick}
            style={{
              transition: "all 0.5s ease",
              transitionDelay: checked ? "0.2s" : "0s",
              transform: checked ? "translateX(0)" : "translateX(-20px)",
              opacity: checked ? 1 : 0,
            }}
            className={`
            text-white
            hover:bg-red-700
            text-xl
            p-1 rounded-lg
            cursor-pointer
            bg-red-600/80
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
            bg-emerald-600/80
            hover:scale-105
            hover:bg-emerald-700
            p-1 rounded-lg
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
