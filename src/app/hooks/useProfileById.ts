import { request } from "../utils/axios";
import { detectArabicUi, localizeErrorMessage } from "../i18n/errorMessages";

export async function getProfileById(userId: string) {
  const isArabic = detectArabicUi();
  try {
    const response = await request.get(`/api/profile/${userId}`);
    if (response.status !== 200) {
      throw new Error(
        localizeErrorMessage(
          "Failed to fetch profile or profile not found",
          isArabic,
        ),
      );
    }
    return response.data;
  } catch {
    throw new Error(
      localizeErrorMessage("Failed to fetch profile by ID", isArabic),
    );
  }
}
