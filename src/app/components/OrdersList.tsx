import React, { FC } from "react";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

interface Order {
  id: string;
  itemName: string;
  amount: number;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  completedAt?: string;
}

interface OrdersListProps {
  orders: Order[];
  type: "current" | "completed";
}

const OrdersList: FC<OrdersListProps> = ({ orders = [], type = "current" }) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  // التأكد من أن orders هي array
  const safeOrders = Array.isArray(orders) ? orders : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "CANCELLED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return t("مكتمل", "Completed");
      case "PENDING":
        return t("قيد الانتظار", "Pending");
      case "CANCELLED":
        return t("ملغى", "Cancelled");
      default:
        return status;
    }
  };

  const filteredOrders =
    type === "current"
      ? safeOrders.filter((order) => order.status === "PENDING")
      : safeOrders
          .filter((order) => order.status === "COMPLETED")
          .sort(
            (a, b) =>
              new Date(b.completedAt || b.createdAt).getTime() -
              new Date(a.completedAt || a.createdAt).getTime(),
          );

  if (filteredOrders.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-lg text-gray-600">
          {type === "current"
            ? t("لا توجد طلبات حالية", "No current orders")
            : t("لا توجد طلبات مكتملة", "No completed orders")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredOrders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md"
        >
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{order.itemName}</h4>
            <p className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleDateString(
                isArabic ? "ar-SA" : "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {order.amount.toLocaleString(isArabic ? "ar-SA" : "en-US")}{" "}
                {t("ر.س", "SAR")}
              </p>
              {order.completedAt && (
                <p className="text-xs text-gray-500">
                  {t("مكتمل في", "Completed on")}{" "}
                  {new Date(order.completedAt).toLocaleDateString(
                    isArabic ? "ar-SA" : "en-US",
                  )}
                </p>
              )}
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(
                order.status,
              )}`}
            >
              {getStatusLabel(order.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrdersList;
