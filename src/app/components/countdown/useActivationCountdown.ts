"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { useWebSocketNotifications } from "@/app/hooks/useSocketNotifications";

const WARNING_SOUND =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

const DAY = 86400000;
const TOTAL_DAYS = 30;
const GRACE_DAYS = 15;

export type ActivationState = "ACTIVE" | "IN_GRACE" | "EXPIRED";

type ProfileSummaryResponse = {
  id: string;
  isActive: boolean;
  activeUntil: string | null;
  balance: number;
  pendingReferralEarnings: number;
};

const fetcher = async (url: string): Promise<ProfileSummaryResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load profile summary");
  }
  return (await res.json()) as ProfileSummaryResponse;
};

export const useActivationCountdown = () => {
  const { data: session } = useSession();
  const user = session?.user;

  const { data: profileSummary, mutate } = useSWR<ProfileSummaryResponse>(
    user?.id ? "/api/profile/summary" : null,
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 1500,
    },
  );

  useWebSocketNotifications(() => {
    void mutate();
  }, Boolean(user?.id));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayed = useRef<number>(0);

  const [hide, setHide] = useState(false);

  const activeUntil = profileSummary?.activeUntil ?? user?.activeUntil ?? null;

  const result = useMemo(() => {
    if (!activeUntil) {
      return {
        state: "EXPIRED" as ActivationState,
        daysLeft: 0,
        progress: 0,
      };
    }

    const now = Date.now();
    const end = new Date(activeUntil).getTime();
    const graceEnd = end + GRACE_DAYS * DAY;

    const diffEnd = Math.ceil((end - now) / DAY);
    const diffGrace = Math.ceil((graceEnd - now) / DAY);

    if (diffEnd >= 0) {
      return {
        state: "ACTIVE" as ActivationState,
        daysLeft: diffEnd,
        progress: (diffEnd / TOTAL_DAYS) * 100,
      };
    }

    if (diffGrace >= 0) {
      return {
        state: "IN_GRACE" as ActivationState,
        daysLeft: diffGrace,
        progress: (diffGrace / GRACE_DAYS) * 100,
      };
    }

    return {
      state: "EXPIRED" as ActivationState,
      daysLeft: 0,
      progress: 0,
    };
  }, [activeUntil]);

  // صوت التحذير أثناء فترة السماح
  useEffect(() => {
    if (result.state !== "IN_GRACE") return;

    const now = Date.now();
    if (now - lastPlayed.current > 30000) {
      audioRef.current?.play().catch(() => {});
      lastPlayed.current = now;
    }
  }, [result.state, result.daysLeft]);

  useEffect(() => {
    audioRef.current = new Audio(WARNING_SOUND);
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const color = useMemo(() => {
    switch (result.state) {
      case "IN_GRACE":
        return "#8b5cf6";
      case "ACTIVE":
        if (result.daysLeft > 10) return "#22c55e";
        if (result.daysLeft > 5) return "#eab308";
        return "#ef4444";
      default:
        return "#6b7280";
    }
  }, [result]);

  return {
    ...result,
    color,
    hide,
    setHide,
    user: {
      ...user,
      activeUntil,
      pendingReferralEarnings:
        profileSummary?.pendingReferralEarnings ??
        Number(user?.pendingReferralEarnings ?? 0),
      balance: profileSummary?.balance ?? Number(user?.balance ?? 0),
    },
  };
};
