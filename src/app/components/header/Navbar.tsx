"use client";

import { useState, useEffect, memo } from "react";
import UserMenu from "./UserMenu";
import Container from "../Container";
import Logo from "./Logo";
import { usePathname } from "next/navigation";
import HomeTabs from "../home/HomeTabs";
import { $Enums } from "@prisma/client";
import { motion } from "framer-motion";
import useScrollDirection from "@/app/hooks/useScrollDirection";
import SearchBar from "./search-box/SearchBar";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "../notification/NotificationBell";

import { useSearchHelper } from "../../hooks/useSearchHelper";

const TOP_BAR_CLASS =
  "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/90";

const DESKTOP_GRID_CLASS =
  "hidden lg:grid grid-cols-[minmax(0,1fr)_minmax(28rem,42rem)_minmax(0,1fr)] items-center gap-4 px-1 py-2";

const MOBILE_GRID_CLASS =
  "lg:hidden grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-1 py-2.5";

const TABLET_SEARCH_CLASS = "hidden md:block lg:hidden px-1 pb-2";

const TABS_ROW_CLASS =
  "hidden md:flex w-full justify-center overflow-hidden pb-1";

interface NavbarProps {
  handleSetType: (t: $Enums.ItemType) => void;
  type: $Enums.ItemType | undefined;
  catName: string;
  q: string;
  setQ: (q: string) => void;
  handelSellOrRent: (t: $Enums.TransactionType) => void;
  sellOrRent: $Enums.TransactionType | undefined;
  handleSetMinPrice?: (min: number) => void;
  handleSetMaxPrice?: (max: number) => void;
  minPrice?: number;
  maxPrice?: number;
}

const Navbar = ({
  type,
  catName,
  setQ,
  q,
  sellOrRent,
  minPrice,
  maxPrice,
}: NavbarProps) => {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith("/admin");
  const scrollDir = useScrollDirection();

  const [isScrolled, setIsScrolled] = useState(false);
  const helper = useSearchHelper();

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 40;
        setIsScrolled((prev) => (prev === next ? prev : next));
        ticking = false;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isAdminPage) return null;

  return (
    <motion.div
      className={TOP_BAR_CLASS}
      initial={{ y: -16, opacity: 0 }}
      animate={{
        y: scrollDir === "down" ? -4 : 0,
        opacity: 1,
        boxShadow: isScrolled
          ? "0 4px 14px rgba(15,23,42,0.09)"
          : "0 0 0 rgba(0,0,0,0)",
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <Container>
        <div dir="ltr" className={DESKTOP_GRID_CLASS}>
          <div className="flex items-center gap-2 min-w-0 shrink-0 justify-self-start">
            <Logo />
          </div>

          <div className="justify-self-center w-full min-w-0">
            <SearchBar
              category={catName}
              setQ={setQ}
              q={q}
              sellOrRent={sellOrRent}
              handelSellOrRent={helper.handleAction}
              handleSetMinPrice={helper.handleSetMinPrice}
              handleSetMaxPrice={helper.handleSetMaxPrice}
              minPrice={minPrice}
              maxPrice={maxPrice}
            />
          </div>

          <div className="flex items-center justify-end gap-2 min-w-0 justify-self-end">
            <div className="hidden xl:flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
            <LanguageToggle />
            <div className="shrink-0">
              <UserMenu />
            </div>
          </div>
        </div>

        <div dir="ltr" className={MOBILE_GRID_CLASS}>
          <div className="flex items-center justify-center">
            <Logo />
          </div>
          <div className="min-w-0 px-0.5">
            <HomeTabs setType={helper.handleSetType} type={type} compact />
          </div>
          <div className="flex items-center justify-end gap-1">
            <NotificationBell hiddenWhenEmpty />
            <UserMenu />
          </div>
        </div>

        <motion.div
          animate={{
            opacity: scrollDir === "down" ? 0 : 1,
            y: scrollDir === "down" ? -15 : 0,
            pointerEvents: scrollDir === "down" ? "none" : "auto",
          }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={TABLET_SEARCH_CLASS}
        >
          <SearchBar
            category={catName}
            setQ={setQ}
            q={q}
            sellOrRent={sellOrRent}
            handelSellOrRent={helper.handleAction}
            handleSetMinPrice={helper.handleSetMinPrice}
            handleSetMaxPrice={helper.handleSetMaxPrice}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />
        </motion.div>

        <motion.div
          animate={{
            opacity: scrollDir === "down" ? 0 : 1,
            y: scrollDir === "down" ? -8 : 0,
            height: scrollDir === "down" ? 0 : "auto",
            pointerEvents: scrollDir === "down" ? "none" : "auto",
          }}
          transition={{ duration: 0.26, ease: "easeInOut" }}
          className={TABS_ROW_CLASS}
        >
          <HomeTabs setType={helper.handleSetType} type={type} />
        </motion.div>
      </Container>
    </motion.div>
  );
};

export default memo(Navbar);
