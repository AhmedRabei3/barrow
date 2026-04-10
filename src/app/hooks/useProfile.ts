import { useCallback, useEffect, useMemo, useState } from "react";
import { toGrandItem } from "../(user)/profile/profileHelper";
import { PurchaseRequest, User } from "@prisma/client";
import { detectArabicUi, localizeErrorMessage } from "../i18n/errorMessages";

type RawProfileItem = Record<string, unknown>;
type FavoriteItem = {
  itemId: string;
  itemType: "NEW_CAR" | "USED_CAR" | "PROPERTY" | "OTHER";
};

export type ProfileData = {
  user: User & {
    referralStats?: {
      invitedCount: number;
      activeInvitedCount: number;
      inactiveInvitedCount: number;
    };
  };
  items: RawProfileItem[];
  purchaseRequests: PurchaseRequest[];
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
      items?: RawProfileItem[];
      purchaseRequests?: PurchaseRequest[];
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
    items?: RawProfileItem[];
    purchaseRequests?: PurchaseRequest[];
    favorites?: FavoriteItem[];
  };

  return {
    user: directUser,
    items: directUser.items ?? [],
    purchaseRequests: directUser.purchaseRequests ?? [],
    favorites: directUser.favorites ?? [],
  };
};

export function useProfile() {
  const isArabic = detectArabicUi();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);
      const res = await fetch("/api/profile");
      if (!res.ok) {
        if (res.status === 401) {
          setIsUnauthorized(true);
          throw new Error(localizeErrorMessage("Unauthorized", isArabic));
        }
        throw new Error(
          localizeErrorMessage("Failed to load profile", isArabic),
        );
      }
      const json = (await res.json()) as ApiProfileResponse;
      setData(normalizeProfileResponse(json));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : localizeErrorMessage("Unexpected error occurred", isArabic),
      );
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
    error,
    isUnauthorized,
    refetch: fetchProfile,
  };
}
