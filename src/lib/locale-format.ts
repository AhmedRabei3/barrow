export const ARABIC_LATIN_DIGITS_LOCALE = "ar-u-nu-latn";
export const ENGLISH_LOCALE = "en-US";

export const getUiLocale = (isArabic: boolean) =>
  isArabic ? ARABIC_LATIN_DIGITS_LOCALE : ENGLISH_LOCALE;

export const formatNumber = (
  value: number,
  isArabic: boolean,
  options?: Intl.NumberFormatOptions,
) => new Intl.NumberFormat(getUiLocale(isArabic), options).format(value);

export const formatDate = (
  value: Date | string | number,
  isArabic: boolean,
  options?: Intl.DateTimeFormatOptions,
) =>
  new Intl.DateTimeFormat(getUiLocale(isArabic), options).format(
    new Date(value),
  );
