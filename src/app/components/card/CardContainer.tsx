import React, { memo } from "react";

interface CardContainerProps {
  setIsPaused: (paused: boolean) => void;
  children: React.ReactNode;
  isOverlayOpen?: boolean;
}

const CardContainer = ({
  setIsPaused,
  children,
  isOverlayOpen = false,
}: CardContainerProps) => {
  return (
    <div
      className={`
      group relative flex h-fit w-full cursor-pointer 
      flex-col overflow-visible rounded-[18px]
      dark:border dark:border-slate-800 dark:bg-slate-950/95
      bg-neutral-200
      shadow-[0_18px_45px_rgba(2,6,23,0.26)] 
      transition-all duration-300 hover:-translate-y-1
      hover:border-sky-400/30 
      hover:shadow-[0_26px_60px_rgba(2,6,23,0.34)]
      active:scale-[0.995] ${isOverlayOpen ? "z-80" : "z-0"}`}
      style={{ contain: "layout" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {children}
    </div>
  );
};

export default memo(CardContainer);
