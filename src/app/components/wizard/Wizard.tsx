"use client";

import { memo, useState } from "react";
import { FieldValues, UseFormHandleSubmit } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { DynamicIcon } from "../addCategory/IconSetter";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface WizardProps {
  steps: React.ReactNode[];
  onSubmit: (data: FieldValues) => void;
  handleSubmit: UseFormHandleSubmit<FieldValues>;
  loading: boolean;
}

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 140 : -140,
    opacity: 0,
    position: "absolute",
  }),
  center: {
    x: 0,
    opacity: 1,
    position: "relative",
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -140 : 140,
    opacity: 0,
    position: "absolute",
  }),
};

const Wizard = ({ steps, onSubmit, handleSubmit, loading }: WizardProps) => {
  const { isArabic } = useAppPreferences();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const next = () => {
    if (step < steps.length - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  return (
    <div className="relative min-h-[70vh] w-full">
      {/* STEP INDICATOR */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-3 h-1 rounded-full transition-all
              ${
                i === step
                  ? "bg-linear-to-r from-blue-500 to-indigo-500 w-5"
                  : "bg-gray-300"
              }
            `}
          />
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="relative overflow-hidden min-h-100">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* LEFT ARROW */}
      {step > 0 && (
        <button
          onClick={prev}
          type="button"
          className="
            absolute -left-7 top-1/2 h-full -translate-y-1/2 
            bg-gray-100 backdrop-blur-sm shadow 
            w-fit flex items-center justify-center 
            rounded-l-full hover:bg-gray-300 transition
          "
        >
          <DynamicIcon
            size={20}
            iconName={isArabic ? "FaChevronRight" : "FaChevronLeft"}
          />
        </button>
      )}

      {/* RIGHT ARROW */}
      {step < steps.length - 1 ? (
        <button
          onClick={next}
          type="button"
          className="
            absolute -right-6 top-1/2 -translate-y-1/2 
            bg-sky-50 backdrop-blur-sm shadow 
            h-full flex items-center justify-center 
            rounded-r-full hover:bg-white transition
          "
        >
          <DynamicIcon
            iconName={isArabic ? "FaChevronLeft" : "FaChevronRight"}
            size={20}
            className="text-sky-700"
          />
        </button>
      ) : !loading ? (
        <button
          className="
            absolute right-2 -translate-y-1/2
            bg-linear-to-r from-blue-500 to-indigo-500
            hover:bg-linear-to-l hover:cursor-pointer 
            text-white
            w-18 h-10 rounded-md transition z-99
          "
          onClick={handleSubmit(onSubmit)}
        >
          {isArabic ? "إرسال" : "Submit"}
        </button>
      ) : (
        <div className="spinner w-7"></div>
      )}
    </div>
  );
};

export default memo(Wizard);
