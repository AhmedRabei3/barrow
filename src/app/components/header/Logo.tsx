"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const Logo = ({
  width = 50,
  height = 50,
  arCustomTxt = "نصلك بالعالم",
  enCustomTxt = "U R Famous",
}: {
  width?: number;
  height?: number;
  arCustomTxt?: string;
  enCustomTxt?: string;
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
      hidden md:inline-block dark:text-slate-300 text-slate-600
      "
        >
          {isArabic ? "مـشــهــور" : "Mashhoor"}
        </span>
        <span
          className="text-[9px] 
          hidden md:inline-block dark:text-slate-300 text-slate-600
         "
        >
          {isArabic ? arCustomTxt : enCustomTxt}
        </span>
      </div>
    </div>
  );
};

export default Logo;
