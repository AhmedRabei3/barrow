import Image from "next/image";
import React, { FC, useState } from "react";
import { FaCamera } from "react-icons/fa";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

interface ProfileHeaderProps {
  user: {
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    createdAt?: string | Date;
  };
  onImageEdit?: () => void;
}

const ProfileHeader: FC<ProfileHeaderProps> = ({ user, onImageEdit }) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [imageHover, setImageHover] = useState(false);

  return (
    <div className="flex items-start justify-between gap-6 rounded-xl border border-gray-200 bg-white p-8">
      <div className="flex items-center gap-6">
        {/* صورة المستخدم مع زر التعديل */}
        <div
          className="relative"
          onMouseEnter={() => setImageHover(true)}
          onMouseLeave={() => setImageHover(false)}
        >
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name}
              width={160}
              height={160}
              className="h-40 w-40 rounded-full object-cover ring-4 ring-blue-100"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-purple-600 ring-4 ring-blue-100">
              <span className="text-5xl font-bold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* زر تعديل الصورة */}
          <button
            onClick={onImageEdit}
            className={`absolute bottom-2 right-2 flex items-center justify-center rounded-full bg-blue-600 p-3 text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-xl ${
              imageHover ? "scale-110" : "scale-100"
            }`}
            title={t("تعديل الصورة", "Edit image")}
          >
            <FaCamera className="text-lg" />
          </button>
        </div>

        {/* معلومات المستخدم */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-gray-900">{user.name}</h1>
          <p className="flex items-center gap-2 text-lg text-gray-600">
            📧 {user.email}
          </p>
          {user.phone && (
            <p className="flex items-center gap-2 text-lg text-gray-600">
              📱 {user.phone}
            </p>
          )}
          <p className="text-sm text-gray-500">
            {t("عضو منذ", "Member since")}{" "}
            {new Date(user.createdAt || Date.now()).toLocaleDateString(
              isArabic ? "ar-SA" : "en-US",
            )}
          </p>
        </div>
      </div>

      {/* شارة التحقق (إذا كان محقق) */}
      <div className="rounded-lg bg-green-50 px-4 py-2">
        <p className="text-sm font-semibold text-green-700">
          ✓ {t("حساب محقق", "Verified account")}
        </p>
      </div>
    </div>
  );
};

export default ProfileHeader;
