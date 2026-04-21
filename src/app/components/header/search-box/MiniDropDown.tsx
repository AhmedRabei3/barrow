"use client";

import { useState, useRef } from "react";
import useClickOutside from "@/app/hooks/useOutsideClick";
import { motion, AnimatePresence } from "framer-motion";

export function MiniDropdown({
  label,
  options,
  onSelect,
}: {
  label: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-2 py-3 bg-slate-100 rounded-3xl text-sm font-medium hover:bg-slate-200 transition"
      >
        {label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute top-12 left-0 bg-white shadow-lg rounded-xl border w-32 text-sm overflow-hidden z-40"
          >
            {options.map((op) => (
              <button
                key={op}
                onClick={() => {
                  onSelect(op);
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2 hover:bg-slate-100"
              >
                {op}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
