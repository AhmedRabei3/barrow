import React from "react";

interface BadgesProps {
  isNew?: boolean;
  isFeatured?: boolean;
}

const Badges = ({ isNew, isFeatured }: BadgesProps) => {
  return (
    <div className="absolute left-3 top-3 z-30 flex flex-col gap-1.5">
      {isNew && (
        <span className="rounded-md border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur-md">
          جديد
        </span>
      )}
      {isFeatured && (
        <span className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_20px_rgba(37,99,235,0.28)]">
          مميز
        </span>
      )}
    </div>
  );
};

export default Badges;
