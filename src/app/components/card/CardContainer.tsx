import React, { memo } from "react";
import { motion } from "framer-motion";

interface CardContainerProps {
  setIsPaused: (paused: boolean) => void;
  children: React.ReactNode;
}

const CardContainer = ({ setIsPaused, children }: CardContainerProps) => {
  return (
    <motion.div
      className="
      group w-full h-full relative flex flex-col bg-transparent rounded-2xl cursor-pointer
      transition-all duration-300 hover:-translate-y-0.5
      hover:shadow-[0_14px_28px_rgba(15,23,42,0.14)]
      hover:ring-1 hover:ring-slate-200/90 dark:hover:ring-slate-700
      active:scale-[0.995]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      initial={{ opacity: 0, scale: 0.97, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

export default memo(CardContainer);
