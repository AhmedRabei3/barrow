export interface PasswordHint {
  ok: boolean;
  ar: string;
  en: string;
}

/** Compute the 6 password strength hints for a given value. */
export function buildPasswordHints(value: string): PasswordHint[] {
  return [
    {
      ok: value.length >= 8,
      ar: "8 أحرف على الأقل",
      en: "At least 8 characters",
    },
    {
      ok: /[A-Z]/.test(value),
      ar: "حرف كبير واحد على الأقل",
      en: "At least one uppercase letter",
    },
    {
      ok: /[a-z]/.test(value),
      ar: "حرف صغير واحد على الأقل",
      en: "At least one lowercase letter",
    },
    {
      ok: /[0-9]/.test(value),
      ar: "رقم واحد على الأقل",
      en: "At least one number",
    },
    {
      ok: /[^A-Za-z0-9]/.test(value),
      ar: "رمز خاص واحد على الأقل",
      en: "At least one symbol",
    },
    {
      ok: value.length === 0 || /^[\x21-\x7E]+$/.test(value),
      ar: "استخدم أحرفًا إنكليزية قياسية فقط",
      en: "Use standard English characters only",
    },
  ];
}
