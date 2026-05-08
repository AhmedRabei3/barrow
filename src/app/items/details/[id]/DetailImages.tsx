"use client";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  MdClose,
  MdChevronLeft,
  MdChevronRight,
  MdZoomIn,
} from "react-icons/md";

interface DetailImages {
  images: Array<{ url: string }>;
}

// ──────────────────────────────────────────────────────────────────────────────
// مكوّن الصورة المكبّرة (Lightbox)
// يُعرض كـ portal فوق كل العناصر ويسمح بالتنقل بين الصور
// ──────────────────────────────────────────────────────────────────────────────
const Lightbox = ({
  images,
  initialIndex,
  onClose,
}: {
  images: Array<{ url: string }>;
  initialIndex: number;
  onClose: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // التنقل بلوحة المفاتيح (Escape للإغلاق، الأسهم للتنقل)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  // منع التمرير في الخلفية أثناء فتح المعاينة
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const currentImage = images[currentIndex];

  return createPortal(
    <div
      className="fixed inset-0 z-999 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* زر الإغلاق */}
      <button
        onClick={onClose}
        aria-label="Close preview"
        className="
          absolute top-4 right-4 z-10
          flex h-10 w-10 items-center justify-center
          rounded-full bg-white/10 hover:bg-white/25
          text-white transition-colors duration-200
          border border-white/20
        "
      >
        <MdClose size={22} />
      </button>

      {/* عداد الصور */}
      <span className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/10">
        {currentIndex + 1} / {images.length}
      </span>

      {/* الصورة الرئيسية */}
      <div
        className="relative max-h-[90vh] max-w-[92vw] sm:max-w-[85vw] md:max-w-[78vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {currentImage ? (
          <Image
            src={currentImage.url}
            alt={`Image ${currentIndex + 1}`}
            width={1400}
            height={1000}
            className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            priority
          />
        ) : null}
      </div>

      {/* أزرار التنقل — تظهر فقط عند وجود أكثر من صورة */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="Previous image"
            className="
              absolute left-3 top-1/2 -translate-y-1/2
              flex h-11 w-11 items-center justify-center
              rounded-full bg-white/10 hover:bg-white/25
              text-white border border-white/20
              transition-colors duration-200
            "
          >
            <MdChevronLeft size={28} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            aria-label="Next image"
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              flex h-11 w-11 items-center justify-center
              rounded-full bg-white/10 hover:bg-white/25
              text-white border border-white/20
              transition-colors duration-200
            "
          >
            <MdChevronRight size={28} />
          </button>
        </>
      )}

      {/* شريط الصور المصغّرة في الأسفل */}
      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto px-2 pb-1"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((im, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-12 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                idx === currentIndex
                  ? "border-sky-400 opacity-100"
                  : "border-white/20 opacity-55 hover:opacity-80"
              }`}
            >
              <Image
                src={im.url}
                alt={`Thumbnail ${idx + 1}`}
                width={80}
                height={60}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// المكوّن الرئيسي: معرض الصور
// ──────────────────────────────────────────────────────────────────────────────
const DetailImages = ({ images }: DetailImages) => {
  const [image, setImage] = useState(images[0]?.url ?? "");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const imageCount = images.length;

  // فتح المعاينة المكبّرة عند النقر على الصورة الرئيسية
  const openLightbox = () => {
    const idx = images.findIndex((im) => im.url === image);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  return (
    <>
      <div className="space-y-4">
        {/* الصورة الرئيسية */}
        <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white/75 dark:border-slate-700/90 dark:bg-slate-950/72">
          {/* طبقة التدرج مع بيانات المعرض */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-slate-950/85 via-slate-900/40 to-transparent px-4 pb-4 pt-12">
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
              <span className="rounded-full border border-white/20 bg-slate-900/75 px-3 py-1 text-xs font-semibold text-slate-100 backdrop-blur-md">
                {Math.max(
                  images.findIndex((im) => im.url === image),
                  0,
                ) + 1}
                /{Math.max(imageCount, 1)}
              </span>
            </div>
          </div>

          {/* أيقونة التكبير */}
          {image && (
            <button
              onClick={openLightbox}
              aria-label="Expand image"
              className="
                pointer-events-auto absolute top-3 right-3 z-20
                flex h-9 w-9 items-center justify-center
                rounded-xl bg-black/40 hover:bg-black/60
                text-white backdrop-blur-sm
                border border-white/20
                transition-colors duration-200
              "
            >
              <MdZoomIn size={20} />
            </button>
          )}

          {/* صورة رئيسية قابلة للنقر */}
          <div
            className="aspect-16/10 overflow-hidden rounded-[22px] cursor-zoom-in"
            onClick={openLightbox}
          >
            {image ? (
              <Image
                alt="Main"
                src={image}
                width={1400}
                height={875}
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                No images available
              </div>
            )}
          </div>
        </div>

        {/* الصور المصغّرة */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((im: { url: string }, index: number) => (
            <div
              key={index}
              onClick={() => setImage(im.url)}
              className={`group relative h-20 min-w-24 cursor-pointer overflow-hidden rounded-2xl border transition-all duration-200 sm:h-24 sm:min-w-32 ${
                image === im.url
                  ? "border-sky-400 shadow-[0_0_0_1px_rgba(125,211,252,0.32)]"
                  : "border-slate-200 bg-white/85 hover:border-blue-300 dark:border-slate-700/90 dark:bg-slate-900/30 dark:hover:border-sky-500/70"
              }`}
            >
              <Image
                src={im.url}
                alt={`Thumbnail ${index}`}
                width={160}
                height={160}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:opacity-90"
              />
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/90 to-transparent px-2 py-1 text-[11px] font-semibold text-white">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* معاينة الصورة المكبّرة */}
      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={handleCloseLightbox}
        />
      )}
    </>
  );
};

export default DetailImages;
