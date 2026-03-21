"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import { useSession } from "next-auth/react";

export default function ReferralHandler() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const registerModal = useRegisterModal();
  const { status } = useSession();

  useEffect(() => {
    if (ref && status === "unauthenticated") {
      registerModal.onOpen(ref);
    }
  }, [ref, registerModal, status]);

  return null;
}
