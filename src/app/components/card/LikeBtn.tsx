import React from "react";
import { AiFillHeart, AiOutlineHeart } from "react-icons/ai";
import toast from "react-hot-toast";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { useSession } from "next-auth/react";

interface LikeBtnProps {
  itemId?: string;
  itemType?: "NEW_CAR" | "USED_CAR" | "PROPERTY" | "OTHER" | null;
}

const LikeBtn = ({ itemId, itemType }: LikeBtnProps) => {
  const { isArabic } = useAppPreferences();
  const { status } = useSession();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const [liked, setLiked] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const checkFavorite = async () => {
      if (!itemId || !itemType || status !== "authenticated") {
        setLiked(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/favorites?itemId=${encodeURIComponent(itemId)}&itemType=${encodeURIComponent(itemType)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as { isFavorite?: boolean };
        setLiked(Boolean(data.isFavorite));
      } catch {
        // ignore
      }
    };

    checkFavorite();
  }, [itemId, itemType, status]);

  const toggleLike = async () => {
    if (!itemId || !itemType || loading) return;
    if (status === "loading") return;

    if (status !== "authenticated") {
      toast.error(
        t(
          "يرجى تسجيل الدخول لإضافة العناصر إلى المفضلة",
          "Please sign in to use favorites",
        ),
      );
      return;
    }

    const nextState = !liked;
    setLiked(nextState);
    setLoading(true);

    try {
      const res = await fetch("/api/favorites", {
        method: liked ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemType }),
      });

      if (!res.ok) {
        setLiked(!nextState);
        toast.error(t("فشل تحديث المفضلة", "Failed to update favorites"));
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("favorites-updated"));
      }
    } catch {
      setLiked(!nextState);
      toast.error(t("فشل تحديث المفضلة", "Failed to update favorites"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleLike}
      disabled={!itemId || !itemType || loading || status === "loading"}
      className="absolute cursor-pointer top-3 right-3 z-20 h-8 w-8 rounded-full bg-white/95 text-slate-700 shadow-md backdrop-blur-sm flex items-center justify-center transition-transform hover:scale-105"
    >
      {liked ? (
        <AiFillHeart className="text-[#ff385c] text-xl" />
      ) : (
        <AiOutlineHeart className="text-xl" />
      )}
    </button>
  );
};

export default React.memo(LikeBtn);
