"use client";

import {
  useCallback,
  createContext,
  memo,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AppLocale = "ar" | "en";
type AppTheme = "light" | "dark";

type AppPreferencesContextValue = {
  locale: AppLocale;
  isArabic: boolean;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null,
);

const STORAGE_THEME_KEY = "barrow-theme";
const STORAGE_LOCALE_KEY = "barrow-locale";
const LOCALE_COOKIE_KEY = "barrow-locale";

interface AppPreferencesProviderProps {
  initialLocale: AppLocale;
  children: ReactNode;
}

const resolveLocale = (value: string | null | undefined): AppLocale => {
  if (!value) return "en";
  return value.toLowerCase().startsWith("ar") ? "ar" : "en";
};

const resolveTheme = (
  savedTheme: string | null,
  systemDark: boolean,
): AppTheme => {
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }
  return systemDark ? "dark" : "light";
};

const applyDocumentPreferences = (locale: AppLocale, theme: AppTheme) => {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  const dir = locale === "ar" ? "rtl" : "ltr";

  html.setAttribute("lang", locale);
  html.setAttribute("dir", dir);
  html.classList.toggle("dark", theme === "dark");
};

const AppPreferencesProvider = ({
  initialLocale,
  children,
}: AppPreferencesProviderProps) => {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);
  const [theme, setThemeState] = useState<AppTheme>("light");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedLocale = window.localStorage.getItem(STORAGE_LOCALE_KEY);
    if (savedLocale === "ar" || savedLocale === "en") {
      setLocale(savedLocale);
    } else {
      const deviceLocale = resolveLocale(window.navigator.language);
      setLocale(deviceLocale);
    }

    const savedTheme = window.localStorage.getItem(STORAGE_THEME_KEY);
    const systemDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setThemeState(resolveTheme(savedTheme, systemDark));
  }, []);

  useEffect(() => {
    applyDocumentPreferences(locale, theme);
  }, [locale, theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const localeHeaders = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );

      let isSameOrigin = true;
      try {
        const base = window.location.origin;
        const targetUrl =
          typeof input === "string"
            ? new URL(input, base)
            : input instanceof URL
              ? input
              : new URL(input.url, base);
        isSameOrigin = targetUrl.origin === base;
      } catch {
        // If URL parsing fails, treat as same-origin relative request.
        isSameOrigin = true;
      }

      if (isSameOrigin) {
        localeHeaders.set("x-lang", locale);
        localeHeaders.set("Accept-Language", locale);
      }

      return originalFetch(input, {
        ...init,
        headers: localeHeaders,
      });
    }) as typeof window.fetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, [locale]);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
    }
  }, []);

  const setLocalePreference = useCallback((nextLocale: AppLocale) => {
    setLocale(nextLocale);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_LOCALE_KEY, nextLocale);

      // تحديث الكوكيز مباشرة عند تغيير اللغة
      document.cookie = `${LOCALE_COOKIE_KEY}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      fetch("/api/set-locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
        credentials: "include", // مهم لإرسال الكوكيز/الجلسة
      });
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
      }
      return nextTheme;
    });
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const nextLocale = prev === "ar" ? "en" : "ar";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_LOCALE_KEY, nextLocale);
        // تحديث الكوكيز مباشرة عند تغيير اللغة
        document.cookie = `${LOCALE_COOKIE_KEY}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
        fetch("/api/set-locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: nextLocale }),
          credentials: "include", // مهم لإرسال الكوكيز/الجلسة
        });
      }
      return nextLocale;
    });
  }, []);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      locale,
      isArabic: locale === "ar",
      setLocale: setLocalePreference,
      toggleLocale,
      theme,
      setTheme,
      toggleTheme,
    }),
    [locale, theme, setTheme, toggleTheme, setLocalePreference, toggleLocale],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
};

export const useAppPreferences = () => {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider",
    );
  }
  return context;
};

export default memo(AppPreferencesProvider);
