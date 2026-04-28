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
        <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-white/10 bg-slate-950/60 px-1.5 py-0.5 backdrop-blur-sm">
          {itemImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDotClick(index)}
              aria-label={`Go to image ${index + 1}`}
              className="flex min-w-6 items-center justify-center rounded-full p-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-300/60"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "w-3 bg-sky-300 shadow"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
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
