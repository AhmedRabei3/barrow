"use client";
import Image from "next/image";
import { useState } from "react";

interface DetailImages {
  images: Array<{ url: string }>;
}

const DetailImages = ({ images }: DetailImages) => {
  const [image, setImage] = useState(images[0]?.url ?? "");
  const imageCount = images.length;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[22px] border border-slate-800/90 bg-slate-950/60">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent px-4 pb-4 pt-12">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-300">
                Gallery
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {imageCount > 1
                  ? `${imageCount} high quality images`
                  : "Single listing image"}
              </p>
            </div>
            <span className="rounded-full border border-white/12 bg-slate-900/80 px-3 py-1 text-xs font-semibold text-slate-100 backdrop-blur-md">
              {Math.max(
                images.findIndex((im) => im.url === image),
                0,
              ) + 1}
              /{Math.max(imageCount, 1)}
            </span>
          </div>
        </div>
        <div className="aspect-[16/10] overflow-hidden rounded-[22px]">
          {image ? (
            <Image
              alt="Main"
              src={image}
              width={1400}
              height={875}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-sm text-slate-400">
              No images available
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {images.map((im: { url: string }, index: number) => (
          <div
            key={index}
            onClick={() => setImage(im.url)}
            className={`group relative h-20 min-w-24 overflow-hidden rounded-2xl border transition-all duration-200 sm:h-24 sm:min-w-32 ${
              image === im.url
                ? "border-sky-400 shadow-[0_0_0_1px_rgba(125,211,252,0.32)]"
                : "border-slate-800/90 hover:border-slate-600"
            }`}
          >
            <Image
              src={im.url}
              alt={`Thumbnail ${index}`}
              width={160}
              height={160}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-90"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent px-2 py-1 text-[11px] font-semibold text-white">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetailImages;
