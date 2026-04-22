import { useCallback, useMemo } from "react";
import { toGrandItem } from "../(user)/profile/profileHelper";
import { User } from "@prisma/client";
import { detectArabicUi, localizeErrorMessage } from "../i18n/errorMessages";
import { useStaleResource } from "./useStaleResource";

type RawProfileItem = Record<string, unknown>;
type FavoriteItem = {
  itemId: string;
  itemType: "NEW_CAR" | "USED_CAR" | "PROPERTY" | "OTHER";
};

export type ProfilePurchaseRequest = {
  id: string;
  itemId: string;
  itemType: "NEW_CAR" | "USED_CAR" | "PROPERTY" | "OTHER";
  buyerId: string;
  buyerNote?: string | null;
  offeredPrice?: string | number | null;
  phoneNumber: string;
  ownerPhoneNumber?: string | null;
  rejectionReason?: string | null;
  status: string;
  assignedAdminId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  buyer?: {
    id: string;
    name: string | null;
    email: string | null;
    profileImage?: string | null;
  };
  itemSummary?: {
    title: string;
    listingUrl: string;
    imageUrl: string | null;
  };
};

export type ProfileData = {
  user: User & {
    referralStats?: {
      invitedCount: number;
      activeInvitedCount: number;
      inactiveInvitedCount: number;
    };
    identityVerificationRequest?: {
      id: string;
      fullName: string;
      nationalId: string;
      frontImageUrl: string;
      backImageUrl: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      adminNote?: string | null;
      createdAt: string | Date;
      updatedAt: string | Date;
      reviewedAt?: string | Date | null;
    } | null;
  };
  items: RawProfileItem[];
  purchaseRequests: ProfilePurchaseRequest[];
  favorites: FavoriteItem[];
};

type ApiProfileResponse =
  | ProfileData
  | (User & {
      referralStats?: {
        invitedCount: number;
        activeInvitedCount: number;
        inactiveInvitedCount: number;
      };
      identityVerificationRequest?: ProfileData["user"]["identityVerificationRequest"];
      items?: RawProfileItem[];
      purchaseRequests?: ProfilePurchaseRequest[];
      favorites?: FavoriteItem[];
    });

const isWrappedProfileResponse = (
  json: ApiProfileResponse,
): json is ProfileData => {
  return (
    typeof json === "object" &&
    json !== null &&
    "user" in json &&
    typeof json.user === "object" &&
    json.user !== null
  );
};

const normalizeProfileResponse = (json: ApiProfileResponse): ProfileData => {
  if (isWrappedProfileResponse(json)) {
    return {
      user: json.user,
      items: json.items ?? [],
      purchaseRequests: json.purchaseRequests ?? [],
      favorites: json.favorites ?? [],
    };
  }

  const directUser = json as User & {
    referralStats?: {
      invitedCount: number;
      activeInvitedCount: number;
      inactiveInvitedCount: number;
    };
    identityVerificationRequest?: ProfileData["user"]["identityVerificationRequest"];
    items?: RawProfileItem[];
    purchaseRequests?: ProfilePurchaseRequest[];
    favorites?: FavoriteItem[];
  };

  return {
    user: directUser,
    items: directUser.items ?? [],
    purchaseRequests: directUser.purchaseRequests ?? [],
    favorites: directUser.favorites ?? [],
  };
};

class ProfileFetchError extends Error {
  isUnauthorized: boolean;

  constructor(message: string, isUnauthorized = false) {
    super(message);
    this.name = "ProfileFetchError";
    this.isUnauthorized = isUnauthorized;
  }
}

export function useProfile() {
  const isArabic = detectArabicUi();
  const fetchProfile = useCallback(
    async (signal: AbortSignal) => {
      const res = await fetch("/api/profile", {
        signal,
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new ProfileFetchError(
            localizeErrorMessage("Unauthorized", isArabic),
            true,
          );
        }

        throw new ProfileFetchError(
          localizeErrorMessage("Failed to load profile", isArabic),
        );
      }

      const json = (await res.json()) as ApiProfileResponse;
      return normalizeProfileResponse(json);
    },
    [isArabic],
  );

  const { data, loading, isRefreshing, error, refetch } =
    useStaleResource<ProfileData>({
      cacheKey: "profile:self",
      fetcher: fetchProfile,
      shouldResetDataOnError: (fetchError) =>
        fetchError instanceof ProfileFetchError && fetchError.isUnauthorized,
    });

  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? localizeErrorMessage("Unexpected error occurred", isArabic)
        : null;
  const isUnauthorized =
    error instanceof ProfileFetchError ? error.isUnauthorized : false;

  /* Normalize items once */
  const normalizedItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map(toGrandItem);
  }, [data?.items]);

  const totalItems = normalizedItems.length;

  return {
    user: data?.user ?? null,
    items: normalizedItems,
    purchaseRequests: data?.purchaseRequests ?? [],
    favorites: data?.favorites ?? [],
    totalItems,
    loading,
    isRefreshing,
    error: errorMessage,
    isUnauthorized,
    refetch,
  };
}
