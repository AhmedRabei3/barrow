"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

type AuthSessionProviderProps = {
  children: ReactNode;
};

export default function AuthSessionProvider({
  children,
}: AuthSessionProviderProps) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
  );
}
