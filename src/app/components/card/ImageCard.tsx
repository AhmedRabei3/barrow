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
  return (
    <div>
      {itemImages[currentIndex]?.url ? (
        <Image
          key={itemImages[currentIndex].url}
          src={itemImages[currentIndex].url}
          alt={`${brand ?? ""} ${model ?? ""}`.trim() || "listing image"}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
          quality={75}
          placeholder="empty"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          decoding="async"
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
