"use client";

import { Toaster } from "react-hot-toast";
import { useAppPreferences } from "./AppPreferencesProvider";

const AppToaster = () => {
  const { isArabic } = useAppPreferences();

  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4500,
        style: {
          direction: isArabic ? "rtl" : "ltr",
          textAlign: isArabic ? "right" : "left",
          maxWidth: "560px",
        },
      }}
      containerStyle={{
        insetInlineStart: "16px",
        insetInlineEnd: "16px",
      }}
    />
  );
};

export default AppToaster;
