import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";

interface ImageCardProps {
  itemImages: { url: string | null }[];
  currentIndex: number;
  brand?: string | null;
  model?: string | null;
  priority?: boolean;
}

const ImageCard = ({
  itemImages,
  currentIndex,
  brand,
  model,
  priority = false,
}: ImageCardProps) => {
  const normalizedImageUrls = useMemo(
    () =>
      itemImages
        .map((image) => (typeof image.url === "string" ? image.url.trim() : ""))
        .filter((url) => url.length > 0),
    [itemImages],
  );
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());
  const imageUrlsSignature = useMemo(
    () => normalizedImageUrls.join("|"),
    [normalizedImageUrls],
  );

  useEffect(() => {
    setFailedUrls(new Set());
  }, [imageUrlsSignature]);

  const fallbackIndex = useMemo(() => {
    if (normalizedImageUrls.length === 0) {
      return -1;
    }

    const safeIndex =
      currentIndex >= 0 && currentIndex < normalizedImageUrls.length
        ? currentIndex
        : 0;

    for (let offset = 0; offset < normalizedImageUrls.length; offset += 1) {
      const idx = (safeIndex + offset) % normalizedImageUrls.length;
      const candidate = normalizedImageUrls[idx];
      if (!failedUrls.has(candidate)) {
        return idx;
      }
    }

    return -1;
  }, [currentIndex, failedUrls, normalizedImageUrls]);

  const imageUrl = fallbackIndex >= 0 ? normalizedImageUrls[fallbackIndex] : "";
  const isCloudinaryImage = imageUrl.includes("res.cloudinary.com/");
  const handleImageError = useCallback(() => {
    if (!imageUrl) {
      return;
    }

    setFailedUrls((previous) => {
      const updated = new Set(previous);
      updated.add(imageUrl);
      return updated;
    });
  }, [imageUrl]);

  return (
    <div className="relative h-full w-full">
      {imageUrl ? (
        <Image
          key={imageUrl}
          src={imageUrl}
          alt={`${brand ?? ""} ${model ?? ""}`.trim() || "listing image"}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 33vw, (max-width: 1679px) 20vw, 16.7vw"
          quality={isCloudinaryImage ? undefined : 60}
          unoptimized={isCloudinaryImage}
          placeholder="empty"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          decoding="async"
          onError={handleImageError}
        />
      ) : (
        <div className="flex justify-center items-center w-full h-full text-slate-500 dark:text-slate-300 text-sm bg-slate-100 dark:bg-slate-900">
          {"No Image"}
        </div>
      )}
    </div>
  );
};

export default ImageCard;
