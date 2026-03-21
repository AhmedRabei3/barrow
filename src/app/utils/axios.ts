import axios, { AxiosHeaders } from "axios";
import { detectUiLocale, localizeErrorMessage } from "@/app/i18n/errorMessages";

const baseURL =
  typeof window !== "undefined"
    ? "" // use same-origin on client to avoid hard-coded ports
    : process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const request = axios.create({
  baseURL,
  withCredentials: true,
});

request.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const locale = detectUiLocale();
    const headers = AxiosHeaders.from(config.headers);
    headers.set("x-lang", locale);
    headers.set("Accept-Language", locale);
    config.headers = headers;
  }
  return config;
});

request.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      const isArabic = detectUiLocale() === "ar";
      const serverMessage = error?.response?.data?.message;
      const rawMessage =
        (typeof serverMessage === "string" && serverMessage) ||
        (typeof error?.message === "string" && error.message) ||
        (isArabic ? "حدث خطأ غير متوقع" : "Unexpected error occurred");

      const localized = localizeErrorMessage(rawMessage, isArabic);
      error.message = localized;

      if (error?.response?.data && typeof error.response.data === "object") {
        error.response.data.message = localized;
      }
    }

    return Promise.reject(error);
  },
);
