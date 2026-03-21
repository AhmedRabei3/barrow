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
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
          {itemImages.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "w-3 bg-white shadow-md"
                  : "w-1.5 bg-white/60 hover:bg-white/85"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default PointsNavigation;
