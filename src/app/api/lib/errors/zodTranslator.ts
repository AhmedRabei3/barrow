import { ZodError, ZodIssue } from "zod";

type IssueWithBounds = ZodIssue & {
  type?: string;
  minimum?: number;
  maximum?: number;
};

const fieldNamesAr: Record<string, string> = {
  brand: "الماركة",
  model: "الموديل",
  year: "السنة",
  color: "اللون",
  price: "السعر",
  description: "الوصف",
  categoryId: "التصنيف",
  sellOrRent: "إما بيع أو تأجير",
  rentType: "نوع الإيجار",
  fuelType: "نوع الوقود",
  gearType: "نوع النقل",
};

function getFieldLabel(path: (string | number | symbol)[] | undefined) {
  if (!path || path.length === 0) return "الحقل";
  const key = String(path[0]);
  return fieldNamesAr[key] ?? key;
}

export function translateZodIssue(issue: ZodIssue) {
  const fieldLabel = getFieldLabel(issue.path);
  const field = String(issue.path[0] ?? "");
  const issueWithBounds = issue as IssueWithBounds;

  switch (issue.code) {
    case "too_small":
      if (issueWithBounds.type === "string") {
        const min = issueWithBounds.minimum;
        return {
          message: `${fieldLabel} يجب أن يحتوي على ${min} أحرف على الأقل.`,
          field,
        };
      }
      if (issueWithBounds.type === "number") {
        const min = issueWithBounds.minimum;
        return {
          message: `${fieldLabel} يجب أن يكون أكبر أو يساوي ${min}.`,
          field,
        };
      }
      return {
        message: `${fieldLabel} قيمة صغيرة جداً.`,
        field,
      };

    case "too_big":
      if (issueWithBounds.type === "string") {
        const max = issueWithBounds.maximum;
        return {
          message: `${fieldLabel} يجب أن لا يتجاوز ${max} أحرف.`,
          field,
        };
      }
      if (issueWithBounds.type === "number") {
        const max = issueWithBounds.maximum;
        return {
          message: `${fieldLabel} يجب أن يكون أصغر أو يساوي ${max}.`,
          field,
        };
      }
      return {
        message: `${fieldLabel} قيمة كبيرة جداً.`,
        field,
      };

    case "invalid_type":
      return {
        message: `${fieldLabel} له نوع غير صالح أو مفقود.`,
        field,
      };

    case "invalid_value":
      return {
        message: `${fieldLabel} يحتوي على قيمة غير مقبولة.`,
        field,
      };

    case "custom":
      return {
        message: issue.message || `${fieldLabel} غير صالح.`,
        field,
      };

    case "invalid_format":
      return {
        message: issue.message || `${fieldLabel} له صيغة غير صحيحة.`,
        field,
      };

    default:
      return {
        message: issue.message || "قيمة غير صالحة.",
        field,
      };
  }
}

export function translateZodError(error: ZodError) {
  if (!error || !error.issues || error.issues.length === 0) {
    return { message: "بيانات الإدخال غير صحيحة.", field: undefined };
  }
  const first = error.issues[0];
  return translateZodIssue(first);
}

export default translateZodError;
