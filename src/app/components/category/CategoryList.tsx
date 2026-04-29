import { useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { DynamicIcon } from "../addCategory/IconSetter";
import type { CategoryItem } from "./types";

interface ListProps {
  list: CategoryItem[];
  setCatName: (c: string) => void;
  catName: string;
  isFiltering?: boolean;
}

const CategoryList = ({
  list,
  setCatName,
  catName,
  isFiltering = false,
}: ListProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const uniqueList = Array.from(
    new Map(list.map((item) => [item.name, item])).values(),
  );

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const scrollAmount =
      direction === "left" ? -clientWidth / 1.5 : clientWidth / 1.5;
    scrollRef.current.scrollTo({
      left: scrollLeft + scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <>
      {" "}
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Scroll categories left"
        className="absolute left-0 z-10 bg-white shadow-md hover:bg-sky-100 text-sky-800 p-2 rounded-full transition-all duration-200 disabled:opacity-30 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-sky-300"
      >
        <FaChevronLeft size={16} />
      </button>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scroll-smooth gap-3 px-4 sm:gap-4 sm:px-8 no-scrollbar scrollbar-hide"
      >
        {uniqueList.map((item, index) => (
          <button
            key={index}
            type="button"
            className={`
             relative flex flex-col items-center 
             justify-center cursor-pointer 
             rounded-lg transform
             transition-transform duration-300 
             hover:scale-105 text-neutral-600 
             hover:text-neutral-800 px-2 py-1
             dark:text-neutral-400 
             dark:hover:text-neutral-200
             ${catName === item.name && "text-sky-400 bg-sky-50 dark:bg-gray-700 dark:text-sky-300"}
             ${catName === item.name && isFiltering ? "animate-pulse shadow-sm shadow-sky-400/35 dark:shadow-sky-500/30" : ""}
             `}
            onClick={() => setCatName(item.name)}
            aria-pressed={catName === item.name}
            aria-label={item.name}
          >
            <span className="flex h-8 w-8 items-center justify-center text-slate-700  dark:text-slate-200">
              {item.icon ? (
                <DynamicIcon iconName={item.icon} size={18} />
              ) : (
                <span className="text-xs font-semibold">
                  {item.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>

            <p className="text-sm">{item.name}</p>

            {catName === item.name && isFiltering ? (
              <>
                <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-sky-300/70 dark:ring-sky-500/50 animate-pulse" />
                <span className="pointer-events-none absolute top-1.5 inset-e-1.5 h-2 w-2 rounded-full bg-sky-500/90 dark:bg-sky-300 animate-pulse" />
              </>
            ) : null}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Scroll categories right"
        className="absolute right-0 z-10 bg-white shadow-md hover:bg-sky-100 text-sky-600 p-2 rounded-full transition-all duration-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-sky-300"
      >
        <FaChevronRight size={16} />
      </button>
    </>
  );
};

export default CategoryList;
