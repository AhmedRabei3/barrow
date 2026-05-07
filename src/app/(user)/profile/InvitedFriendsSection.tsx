"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

// ──────────────────────────────────────────────────────────────────────────────
// أنواع البيانات
// ──────────────────────────────────────────────────────────────────────────────
type InviteeTab = "ALL" | "ACTIVATED" | "PENDING";

interface ReferralUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  isActive: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// مساعدات الواجهة
// ──────────────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

const getAvatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffff;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (name[0] ?? "?").toUpperCase();
};

// ──────────────────────────────────────────────────────────────────────────────
// الأفاتار
// ──────────────────────────────────────────────────────────────────────────────
const Avatar = ({ user }: { user: ReferralUser }) => {
  const color = getAvatarColor(user.userId);
  if (user.image) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
        <Image
          src={user.image}
          alt={user.name}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
    );
  }
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color} text-sm font-bold text-white`}
    >
      {getInitials(user.name)}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// بطاقة مدعو واحد
// ──────────────────────────────────────────────────────────────────────────────
const InviteeCard = ({
  user,
  onMessage,
}: {
  user: ReferralUser;
  onMessage: (userId: string, name: string) => void;
}) => {
  const { isArabic } = useAppPreferences();

  return (
    <div
      className="
        flex items-center justify-between gap-3
        rounded-2xl border
        border-slate-200 dark:border-slate-700/60
        bg-white dark:bg-slate-900/60
        px-4 py-3
        transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50
      "
    >
      {/* معلومات المدعو */}
      <div className="flex min-w-0 items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {user.name}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {user.email}
          </p>
        </div>
      </div>

      {/* حالة التفعيل + زر المراسلة */}
      <div className="flex shrink-0 items-center gap-2">
        {/* شارة الحالة */}
        <span
          className={`
            rounded-full px-2.5 py-0.5 text-[11px] font-semibold
            ${
              user.isActive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            }
          `}
        >
          {user.isActive
            ? isArabic
              ? "مفعّل"
              : "Active"
            : isArabic
              ? "بانتظار التفعيل"
              : "Pending"}
        </span>

        {/* زر المراسلة — يفتح الدردشة مع المدعو */}
        <button
          onClick={() => onMessage(user.userId, user.name)}
          aria-label={isArabic ? `مراسلة ${user.name}` : `Message ${user.name}`}
          title={isArabic ? "مراسلة" : "Message"}
          className="
            flex h-8 w-8 items-center justify-center
            rounded-xl
            border border-slate-200 dark:border-slate-700
            bg-sky-50 dark:bg-sky-900/30
            text-sky-600 dark:text-sky-400
            hover:bg-sky-100 dark:hover:bg-sky-800/40
            transition-colors duration-200
          "
        >
          <DynamicIcon iconName="MdChat" size={16} />
        </button>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// القسم الرئيسي: الأصدقاء المدعوون
// ──────────────────────────────────────────────────────────────────────────────
const InvitedFriendsSection = () => {
  const { isArabic } = useAppPreferences();
  const router = useRouter();

  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<InviteeTab>("ALL");

  // جلب بيانات الإحالات
  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/referrals");
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        setReferrals(json.data ?? []);
      } catch {
        setReferrals([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReferrals();
  }, []);

  // فلترة القائمة حسب التبويب
  const filteredReferrals = referrals.filter((r) => {
    if (activeTab === "ACTIVATED") return r.isActive;
    if (activeTab === "PENDING") return !r.isActive;
    return true;
  });

  const activatedCount = referrals.filter((r) => r.isActive).length;
  const pendingCount = referrals.filter((r) => !r.isActive).length;

  // فتح صفحة الرسائل مع المدعو
  const handleMessage = (userId: string, name: string) => {
    // نفتح صفحة الرسائل ونحدد المستخدم الآخر فقط بدون listing محدد
    // سيبدأ المستخدم محادثة مع المدعو يدوياً
    router.push(
      `/messages?ownerId=${userId}&title=${encodeURIComponent(name)}`,
    );
  };

  const tabs: {
    key: InviteeTab;
    labelAr: string;
    labelEn: string;
    count: number;
  }[] = [
    { key: "ALL", labelAr: "الكل", labelEn: "All", count: referrals.length },
    {
      key: "ACTIVATED",
      labelAr: "مفعّلون",
      labelEn: "Activated",
      count: activatedCount,
    },
    {
      key: "PENDING",
      labelAr: "بانتظار التفعيل",
      labelEn: "Pending",
      count: pendingCount,
    },
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="
        rounded-[22px] border
        border-slate-200/70 dark:border-slate-700/60
        bg-white/95 dark:bg-slate-900/70
        p-5 shadow-sm
      "
    >
      {/* رأس القسم */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DynamicIcon
            iconName="MdPeople"
            size={22}
            className="text-sky-500 dark:text-sky-400"
          />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {isArabic ? "الأصدقاء المدعوون" : "Invited Friends"}
          </h2>
        </div>
        {/* إجمالي عدد المدعوين */}
        <span className="rounded-full bg-sky-100 dark:bg-sky-900/40 px-3 py-0.5 text-sm font-bold text-sky-700 dark:text-sky-300">
          {referrals.length}
        </span>
      </div>

      {/* التبويبات */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold
              transition-colors duration-200
              ${
                activeTab === tab.key
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }
            `}
          >
            {isArabic ? tab.labelAr : tab.labelEn}
            {tab.count > 0 && (
              <span className="ms-1.5 opacity-75">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* القائمة */}
      {loading ? (
        // هيكل تحميل
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : filteredReferrals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <DynamicIcon
            iconName="MdPersonSearch"
            size={40}
            className="text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isArabic
              ? activeTab === "ALL"
                ? "لم تقم بدعوة أحد بعد"
                : activeTab === "ACTIVATED"
                  ? "لا يوجد أصدقاء مفعّلون بعد"
                  : "لا يوجد أصدقاء بانتظار التفعيل"
              : activeTab === "ALL"
                ? "You haven't invited anyone yet"
                : activeTab === "ACTIVATED"
                  ? "No activated friends yet"
                  : "No friends pending activation"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredReferrals.map((user) => (
            <InviteeCard key={user.id} user={user} onMessage={handleMessage} />
          ))}
        </div>
      )}
    </div>
  );
};

export default InvitedFriendsSection;
