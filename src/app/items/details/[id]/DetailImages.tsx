"use client";
import Image from "next/image";
import { useState } from "react";

interface DetailImages {
  images: Array<{ url: string }>;
}

const DetailImages = ({ images }: DetailImages) => {
  const [image, setImage] = useState(images[0]?.url ?? "");

  return (
    <>
      {/* الصورة الرئيسية */}
      <div className="w-full aspect-video rounded-lg overflow-hidden mb-3">
        <Image
          alt="Main"
          src={image}
          width={1200}
          height={675}
          className="w-full h-full object-cover transition-all duration-300 hover:scale-105"
        />
      </div>

      {/* شريط الصور */}
      <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-sky-400 scrollbar-track-sky-100 p-1">
        {images.map((im: { url: string }, index: number) => (
          <div
            key={index}
            onClick={() => setImage(im.url)}
            className={`min-w-17.5 sm:min-w-17.5 md:min-w-27.5 h-17.5 sm:h-22.5 md:h-27.5 rounded-lg overflow-hidden cursor-pointer border-2 transition-all duration-200 ${
              image === im.url ? "border-sky-600" : "border-transparent"
            }`}
          >
            <Image
              src={im.url}
              alt={`Thumbnail ${index}`}
              width={160}
              height={160}
              className="w-full h-full object-cover hover:opacity-80"
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default DetailImages;
