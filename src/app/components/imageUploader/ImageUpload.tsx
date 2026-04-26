"use client";

import Image from "next/image";
import { Dispatch, SetStateAction, useState, useEffect } from "react";
import { AiOutlineCloseCircle } from "react-icons/ai";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface ImageUploadProps {
  selectedImages: File[];
  setSelectedImages: Dispatch<SetStateAction<File[]>>;
}

const ImageUpload = ({
  selectedImages,
  setSelectedImages,
}: ImageUploadProps) => {
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  // توليد معاينات من selectedImages وادارة موارد URL
  useEffect(() => {
    const urls = selectedImages.map((f) => URL.createObjectURL(f));
    setPreviewImages(urls);

    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [selectedImages]);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incomingFiles = Array.from(files);

    setSelectedImages((prev) => {
      const existingKeys = new Set(
        prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );

      const uniqueIncoming = incomingFiles.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

      return [...prev, ...uniqueIncoming];
    });
  };

  const handleRemove = (index: number) => {
    setSelectedImages((prev: File[]) => prev.filter((_, i) => i !== index));
  };

  return (
    <div
      className="
       border-dashed 
       border-2 rounded-md py-1
       border-sky-700 flex flex-col 
       items-center h-full
      "
      onDrop={(e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <label
        htmlFor="imageUpload"
        className="w-full hover:cursor-grab mx-auto text-center h-full"
      >
        {t("اسحب الصور هنا أو اخترها", "Drop images here or select")}
      </label>
      <input
        id="imageUpload"
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Preview */}
      {previewImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {previewImages.map((src, idx) => (
            <div
              key={idx}
              className="flex relative text-white hover:scale-105 transition-all duration-300"
            >
              <AiOutlineCloseCircle
                onClick={() => handleRemove(idx)}
                className="absolute top-1 left-1 cursor-pointer  hover:text-red-700 text-xl"
              />
              <Image
                src={src}
                alt={`preview-${idx}`}
                width={200}
                height={200}
                className="w-full h-auto object-cover rounded-lg"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
