"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import logoImage from "../../../../public/images/logo.png";

function getLogoSize(targetWidth: number, targetHeight?: number) {
  if (targetHeight === undefined) {
    return {
      width: targetWidth,
      height: (targetWidth * logoImage.height) / logoImage.width,
    };
  }

  const scale = Math.min(
    targetWidth / logoImage.width,
    targetHeight / logoImage.height,
  );

  return {
    width: logoImage.width * scale,
    height: logoImage.height * scale,
  };
}

const Logo = ({
  width = 50,
  height,
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
  const logoSize = getLogoSize(width, height);

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
        src={logoImage}
        width={logoImage.width}
        height={logoImage.height}
        style={{ width: logoSize.width, height: logoSize.height }}
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
