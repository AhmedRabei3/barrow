"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { RiArrowGoBackFill, RiCloseLargeFill } from "react-icons/ri";

const GoBackBtn = ({ closeBtn = false }: { closeBtn?: boolean }) => {
  const router = useRouter();
  return (
    <button
      id="go-back"
      className={`bg-rose-500/72 dark:bg-slate-900/72
       text-white dark:text-rose-500
       border border-white/70 dark:border-slate-700/70
       shadow-md hover:shadow-lg
       hover:bg-white/85 dark:hover:bg-slate-900/85
       w-fit p-2.5 rounded-full hover:text-rose-500 
       transition-colors duration-300
       backdrop-blur-md
       z-30
       ${closeBtn ? "" : "fixed top-[27vh] left-5 "}
       font-bold
       cursor-pointer
      "`}
      onClick={router.back}
    >
      {closeBtn ? <RiCloseLargeFill /> : <RiArrowGoBackFill />}
    </button>
  );
};

export default GoBackBtn;
