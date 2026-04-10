"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const Logo = ({
  width = 50,
  height = 50,
}: {
  width?: number;
  height?: number;
}) => {
  const router = useRouter();
  const { isArabic } = useAppPreferences();
  return (
    <div
      className="
     flex 
     items-center font-bold
    "
    >
      <Image
        onClick={() => {
          router.push("/");
        }}
        alt="logo"
        className="cursor-pointer 
        overflow-hidden"
        src="/images/logo.png"
        width={width}
        height={height}
      />
      <div className="flex flex-col leading-[0.9]">
        <span
          className="text-xs 
      hidden md:inline-block
      "
        >
          {isArabic ? "مشهور" : "Mashhoor"}
        </span>
        <span
          className="text-[10px] 
      hidden md:inline-block text-slate-400
      "
        >
          {isArabic ? "تسويق ذكي" : "Smart Marketing"}
        </span>
      </div>
    </div>
  );
};

export default Logo;
