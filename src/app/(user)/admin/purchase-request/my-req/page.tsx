"use client";

import { useEffect, useState } from "react";
import { MdOutlineRefresh } from "react-icons/md";
import toast from "react-hot-toast";
import { ARABIC_LATIN_DIGITS_LOCALE } from "@/lib/locale-format";

interface PurchaseRequest {
  id: string;
  price: number;
  note: string | null;
  createdAt: string;
  buyer: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function UnassignedPurchaseRequests() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/purchase-req/unassigned");
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "فشل جلب الطلبات");
        return;
      }

      setRequests(data.data);
    } catch {
      toast.error("حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  const claimRequest = async (requestId: string) => {
    const res = await fetch("/api/purchase/admin_claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "تعذر استلام الطلب");
      return;
    }

    toast.success("تم استلام الطلب بنجاح");
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return <p className="p-6">جاري تحميل العناصر...</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-emerald-900 ">
        طلبات الشراء الجديدة
      </h1>

      {requests.length === 0 ? (
        <div className="text-gray-500 flex flex-col items-center gap-4 py-4">
          <p>لا توجد طلبات بانتظار الإشراف</p>
          <button
            type="button"
            onClick={fetchRequests}
            className="px-4 py-2 rounded-md border border-neutral-300 hover:bg-neutral-100 text-neutral-700 inline-flex items-center gap-2"
          >
            <MdOutlineRefresh className="text-lg" />
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl shadow-sm w-100 bg-white"
            >
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {request.buyer.name || "مستخدم"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {request.buyer.email}
                    </p>
                  </div>
                  <button
                    className="
                     p-2 shadow-md bg-emerald-500 
                     hover:bg-emerald-600 
                     rounded-md 
                     text-emerald-900
                    "
                    onClick={() => claimRequest(request.id)}
                  >
                    استلام الطلب
                  </button>
                  <button
                    className="p-2 shadow-md bg-rose-500 hover:bg-rose-600 rounded-md text-rose-900"
                    onClick={() => claimRequest(request.id)}
                  >
                    حذف الطلب
                  </button>
                </div>
                <span className="text-xs text-gray-400 flex justify-self-end">
                  {new Date(request.createdAt).toLocaleString(
                    ARABIC_LATIN_DIGITS_LOCALE,
                  )}
                </span>

                <div className="text-sm text-gray-700">
                  {request.note && <p>ملاحظة: {request.note}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
