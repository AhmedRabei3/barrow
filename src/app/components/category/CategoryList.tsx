import { useRef } from "react";
import { DynamicIcon } from "../addCategory/IconSetter";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { CategoryItem } from "./types";

interface ListProps {
  list: CategoryItem[];
  setCatName: (c: string) => void;
  catName: string;
}

const CategoryList = ({ list, setCatName, catName }: ListProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
    const uniqueList = Array.from(
    new Map(list.map((item) => [item.name, item])).values()
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
        onClick={() => scroll("left")}
        className="absolute left-0 z-10 bg-white shadow-md hover:bg-sky-100 text-sky-800 p-2 rounded-full transition-all duration-200 disabled:opacity-30"
      >
        <FaChevronLeft size={16} />
      </button>
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scroll-smooth gap-4 px-10 no-scrollbar scrollbar-hide"
      >
        {uniqueList.map((item, index) => (
          <div
            key={index}
            className={`
             flex flex-col items-center 
             justify-center cursor-pointer 
             rounded-lg transform
             transition-transform duration-300 
             hover:scale-105 text-neutral-600 
             hover:text-neutral-800 px-2 py-1
             ${catName === item.name && "text-rose-400 bg-sky-50"}
             `}
            onClick={() => setCatName(item.name)}
          >
            <DynamicIcon iconName={item.icon!} size={22} />

            <p className="text-sm">{item.name}</p>
          </div>
        ))}
      </div>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 z-10 bg-white shadow-md hover:bg-sky-100 text-sky-600 p-2 rounded-full transition-all duration-200"
      >
        <FaChevronRight size={16} />
      </button>
    </>
  );
};

export default CategoryList;
