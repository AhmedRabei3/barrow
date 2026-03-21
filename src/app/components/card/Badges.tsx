import React from "react";

interface BadgesProps {
  isNew?: boolean;
  isFeatured?: boolean;
}

const Badges = ({ isNew, isFeatured }: BadgesProps) => {
  return (
    <div className="absolute top-3 left-3 flex flex-col gap-1 z-30">
      {isNew && (
        <span className="bg-white/95 text-slate-900 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm">
          جديد
        </span>
      )}
      {isFeatured && (
        <span className="bg-[#ff385c] text-white px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm">
          مميز
        </span>
      )}
    </div>
  );
};

export default Badges;
