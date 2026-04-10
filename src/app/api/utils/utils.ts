import { locationSchema } from "@/app/validations";
import { Errors } from "../lib/errors/errors";
import { uploadToCloudinary } from "./cloudinary";

interface locCheckProps {
  formData: FormData;
  folder?: string;
  isArabic?: boolean;
}

/*------------Conver to boolean value---------------------- */
export const toBool = (v: FormDataEntryValue | null): boolean | undefined => {
  if (v === null) return undefined;
  if (v === "true" || v === "1" || v === "on") return true;
  if (v === "false" || v === "0" || v === "off") return false;
  return undefined;
};

/* ---------convert value to undefinde if null------------- */
export const toNumber = (v: FormDataEntryValue | null): number | undefined => {
  if (v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/* --------Trim and normalize string (remove extra whitespace) --------- */
export const normString = (
  v: FormDataEntryValue | null,
): string | undefined => {
  if (v === null || v === "") return undefined;
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s : undefined;
};

/* --------Convert string value to upper case --------- */
export const normEnum = (v: FormDataEntryValue | null) => {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.toUpperCase() : undefined;
};

/* -------- 4. VALIDATE LOCATION -------- */
export const locCheck = ({ formData }: locCheckProps) => {
  const locRaw = {
    latitude: toNumber(formData.get("latitude")),
    longitude: toNumber(formData.get("longitude")),
    city: formData.get("city")?.toString(),
    address: formData.get("address")?.toString(),
    state: formData.get("state")?.toString() || "",
    country: formData.get("country")?.toString() || "",
  };

  const locParsed = locationSchema.safeParse({
    ...locRaw,
    itemId: "temp",
  });

  if (!locParsed.success) {
    throw Errors.VALIDATION("يرجى اختيار الموقع على الخريطة");
  }

  return locParsed.data;
};

//---------------ImageUploader-----------------------//
export const images = async ({ formData, folder, isArabic }: locCheckProps) => {
  const files = formData
    .getAll("images")
    .filter(
      (entry): entry is File =>
        typeof entry !== "string" &&
        typeof (entry as File).arrayBuffer === "function",
    );

  if (!files.length) {
    throw Errors.VALIDATION(
      isArabic
        ? "يرجى رفع صورة واحدة على الأقل"
        : "Please upload at least one image",
    );
  }
  const uploadedImages = await Promise.all(
    files.map((file) => uploadToCloudinary(file, folder)),
  );
  return uploadedImages;
};

/**--------------optional image uploader-------------------- */
export const imageOptional = async ({ formData, folder }: locCheckProps) => {
  const files = formData
    .getAll("images")
    .filter(
      (entry): entry is File =>
        typeof entry !== "string" &&
        typeof (entry as File).arrayBuffer === "function",
    );

  if (!files.length) {
    return [];
  }

  const uploadedImages = await Promise.all(
    files.map((file) => uploadToCloudinary(file, folder)),
  );
  return uploadedImages;
};
