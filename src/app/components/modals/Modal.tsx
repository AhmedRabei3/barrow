"use client";

import { useCallback, useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import Button from "../Button";
import { FieldValues, UseFormReset } from "react-hook-form";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const ACTION_TITLES = new Set([
  "Login",
  "تسجيل الدخول",
  "Register",
  "إنشاء حساب",
  "Activate Account",
  "تفعيل الحساب",
  "Add Car",
  "إضافة سيارة جديدة",
  "تعديل السيارة",
]);

const shouldRenderActions = (title?: string) =>
  Boolean(title && ACTION_TITLES.has(title));

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

  const renderActions = shouldRenderActions(title);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="
      justify-center
      items-center
      flex
      overflow-x-hidden
      overflow-y-auto
      fixed
      inset-0
      z-99
      outline-none
      focus:outline-none
      bg-neutral-800/70
      backdrop-blur-sm
    "
    >
      <div
        className="
            relative
            w-full
            md:w-4/6
            sm:w-2/3
            sm:h-3/4
            lg:w3/6
            xl:w-2/5
            my-6
            mx-auto
            h-full
            lg:h-auto
            md:h-auto
            
          "
      >
        <div
          className={`
            translate
            duration-300
            h-full ${showModal ? "translate-y-0" : "translate-y-full"}
            h-full ${showModal ? "opacity-100" : "opacity-0"}
            max-h-[90vh]
            `}
        >
          <div
            className="
              translate
              h-full
              lg:h-auto
              md:h-auto
              border-0
              rounded-lg
              shadow-lg
              relative
              flex
              flex-col
              bg-white dark:bg-slate-900
              text-slate-800 dark:text-slate-100
              outline-none
              focus:outline-none
              
            "
          >
            <div
              className="
              flex
              items-center
              p-2
              rounded-t
              justify-center
              relative
              border-b border-slate-200 dark:border-slate-700
              "
            >
              <button
                onClick={handleClose}
                className="
                p-0.5
                border-0
                hover:opacity-70
                transition
                absolute
                top-2
                hover:cursor-pointer
                bg-rose-600
                text-amber-50
                rounded-md
              "
                style={isArabic ? { right: "2rem" } : { left: "2rem" }}
              >
                <IoMdClose size={19} />
              </button>
              <div
                className="
                text-lg font-semibold text-slate-900 dark:text-slate-100
              "
              >
                {title}
              </div>
            </div>

            <div
              className="
                relative
                p-6
                flex-auto
                max-h-150
                overflow-auto
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

            {renderActions && (
              <div className="flex flex-col gap-1 p-6 text-slate-700 dark:text-slate-300 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-700">
                <div
                  className="
                  flex
                  flex-row
                  items-center
                  gap-4
                  w-full
                "
                >
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
        </div>
      </div>
    </div>
  );
};

export default Modal;
