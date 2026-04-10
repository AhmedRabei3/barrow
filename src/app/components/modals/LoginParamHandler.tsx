"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import useLoginModal from "@/app/hooks/useLoginModal";
import { useSession } from "next-auth/react";

export default function LoginParamHandler() {
  const onOpen = useLoginModal((state) => state.onOpen);
  const { status } = useSession();
  const pathname = usePathname();
  const openedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status === "loading" || status === "authenticated") return;
    if (openedRef.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("login") !== "true") return;

    openedRef.current = true;
    onOpen();
    const url = new URL(window.location.href);
    url.searchParams.delete("login");
    window.history.replaceState({}, "", url.toString());
  }, [onOpen, status, pathname]);

  return null;
}
