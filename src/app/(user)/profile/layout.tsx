import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Private user profile",
  robots: {
    index: false,
    follow: false,
  },
};

const layout = ({ children }: { children: React.ReactNode }) => {
  return children;
};

export default layout;
