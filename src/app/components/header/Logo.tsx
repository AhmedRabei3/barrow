"use client";
import { useRouter } from "next/navigation";
import Image from "next/image";

const Logo = () => {
  const router = useRouter();
  return (
    <div
      className="
     flex flex-col 
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
        width={50}
        height={50}
      />
      <span
        className="text-xs 
      hidden md:inline-block
      "
      >
        دليلك الآمن
      </span>
    </div>
  );
};

export default Logo;
