"use client";
import { useEffect, useRef } from "react";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import { useSession } from "next-auth/react";

const REFERRAL_STORAGE_KEY = "pending-referrer-id";

const isReferralId = (value: string | null) =>
  Boolean(value && /^c[a-z0-9]{24,}$/i.test(value));

export default function ReferralHandler() {
  const onOpen = useRegisterModal((state) => state.onOpen);
  const { status } = useSession();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || status !== "unauthenticated") {
      return;
    }

    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");

    if (!isReferralId(ref)) {
      return;
    }

    if (handledRef.current === ref) {
      return;
    }

    handledRef.current = ref;
    window.sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref as string);
    onOpen(ref as string);
    url.searchParams.delete("ref");
    window.history.replaceState({}, "", url.toString());
  }, [onOpen, status]);

  return null;
}
