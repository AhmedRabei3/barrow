"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoMdClose } from "react-icons/io";
import Button from "../Button";
import { FieldValues, UseFormReset } from "react-hook-form";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const shouldRenderActions = ({
  actionLabel,
  secondaryAction,
  secondaryActionLabel,
  footer,
}: {
  actionLabel?: string;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  footer?: React.ReactElement;
}) =>
  Boolean(actionLabel || (secondaryAction && secondaryActionLabel) || footer);

interface ModalProps {
  isOpen: boolean;
  disabled: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  title?: string;
  actionLabel?: string;
  body?: React.ReactNode;
  footer?: React.ReactElement;
  reset?: UseFormReset<FieldValues>;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  reset,
  disabled,
  onClose,
  onSubmit,
  secondaryAction,
  secondaryActionLabel,
  title,
  actionLabel,
  body,
  footer,
}) => {
  const [showModal, setShowModal] = useState(isOpen);
  const { isArabic } = useAppPreferences();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setTimeout(() => {
      onClose();
      if (reset) reset();
    }, 300);
  }, [onClose, reset]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    onSubmit?.();
  }, [disabled, onSubmit]);

  const handleSecondaryAction = useCallback(() => {
    if (disabled || !secondaryAction) return;
    secondaryAction();
  }, [disabled, secondaryAction]);

  const renderActions = shouldRenderActions({
    actionLabel,
    secondaryAction,
    secondaryActionLabel,
    footer,
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden bg-neutral-800/70 backdrop-blur-sm p-4"
    >
      <div
        className={`
          relative w-full sm:w-2/3 md:w-4/6 lg:w-3/6 xl:w-2/5
          flex flex-col
          border-0 rounded-lg shadow-lg
          bg-white dark:bg-slate-900
          text-slate-800 dark:text-slate-100
          max-h-[90vh]
          transition duration-300
          ${showModal ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        `}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center p-2 rounded-t justify-center relative border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={handleClose}
            className="p-0.5 border-0 hover:opacity-70 transition absolute top-2 hover:cursor-pointer bg-rose-600 text-amber-50 rounded-md"
            style={isArabic ? { right: "2rem" } : { left: "2rem" }}
          >
            <IoMdClose size={19} />
          </button>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </div>
        </div>

        {/* Body */}
        <div
          className="
            relative p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain
            [&_input]:text-slate-900 dark:[&_input]:text-slate-100
            [&_input]:placeholder:text-slate-400 dark:[&_input]:placeholder:text-slate-500
            [&_input]:bg-white dark:[&_input]:bg-slate-800
            [&_input]:border-slate-300 dark:[&_input]:border-slate-600
            [&_textarea]:text-slate-900 dark:[&_textarea]:text-slate-100
            [&_textarea]:placeholder:text-slate-400 dark:[&_textarea]:placeholder:text-slate-500
            [&_textarea]:bg-white dark:[&_textarea]:bg-slate-800
            [&_textarea]:border-slate-300 dark:[&_textarea]:border-slate-600
            [&_select]:text-slate-900 dark:[&_select]:text-slate-100
            [&_select]:bg-white dark:[&_select]:bg-slate-800
            [&_select]:border-slate-300 dark:[&_select]:border-slate-600
          "
        >
          {body}
        </div>

        {/* Actions */}
        {renderActions && (
          <div className="shrink-0 flex flex-col gap-1 border-t border-slate-200 p-6 text-slate-700 dark:border-slate-700 dark:text-slate-300 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-700">
            <div className="flex flex-row items-center gap-4 w-full">
              {secondaryAction && secondaryActionLabel && (
                <Button
                  outline
                  disabled={disabled}
                  onClick={handleSecondaryAction}
                  label={secondaryActionLabel}
                />
              )}
              <Button
                disabled={disabled}
                onClick={handleSubmit}
                label={actionLabel}
              />
            </div>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
