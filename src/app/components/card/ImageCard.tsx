import { motion } from "framer-motion";

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
        <motion.img
          key={itemImages[currentIndex].url}
          src={itemImages[currentIndex].url}
          alt={`${brand} ${model}`}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          initial={{ opacity: 0.15, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
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
