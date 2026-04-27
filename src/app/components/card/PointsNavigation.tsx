import React from "react";

interface PointsNavigationProps {
  itemImages: { url: string | null }[];
  currentIndex: number;
  handleDotClick: (index: number) => void;
}

const PointsNavigation = ({
  itemImages,
  currentIndex,
  handleDotClick,
}: PointsNavigationProps) => {
  return (
    <>
      {itemImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-slate-950/70 px-2 py-1 backdrop-blur-md">
          {itemImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDotClick(index)}
              aria-label={`Go to image ${index + 1}`}
              className="flex h-12 w-12 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80"
            >
              <span
                className={`block h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "w-4 bg-sky-300 shadow-md"
                    : "w-1.5 bg-white/35 hover:bg-white/65"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
};

export default PointsNavigation;
