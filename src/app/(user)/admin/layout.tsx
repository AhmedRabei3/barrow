import React from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Private admin dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

async function layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/?login=true");
  }

  if (!session.user.isAdmin) {
    redirect("/");
  }

  return <div>{children}</div>;
}

export default layout;
