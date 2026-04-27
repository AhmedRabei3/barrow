import Image from "next/image";

interface ImageCardProps {
  itemImages: { url: string | null }[];
  currentIndex: number;
  brand?: string | null;
  model?: string | null;
}

const ImageCard = ({
  itemImages,
  currentIndex,
  brand,
  model,
}: ImageCardProps) => {
  return (
    <div>
      {itemImages[currentIndex]?.url ? (
        <Image
          key={itemImages[currentIndex].url}
          src={itemImages[currentIndex].url}
          alt={`${brand} ${model}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
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
