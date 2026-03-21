import React, { FC } from "react";
import { FaWallet, FaMoneyBillWave, FaHourglass } from "react-icons/fa";

interface BalanceSectionProps {
  totalBalance: number;
  pendingBalance: number;
  readyToWithdraw: number;
}

const BalanceSection: FC<BalanceSectionProps> = ({
  totalBalance = 0,
  pendingBalance = 0,
  readyToWithdraw = 0,
}) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-SA", {
      style: "currency",
      currency: "SAR",
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* إجمالي الرصيد */}
      <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-linear-to-br from-blue-50 to-blue-100 p-6">
        <div className="absolute -right-8 -top-8 text-8xl text-blue-200 opacity-10">
          <FaWallet />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-600 p-3 text-white">
              <FaWallet className="text-xl" />
            </div>
            <p className="text-sm font-medium text-blue-600">إجمالي الرصيد</p>
          </div>
          <p className="mt-4 text-3xl font-bold text-blue-900">
            {formatCurrency(totalBalance)}
          </p>
        </div>
      </div>

      {/* الرصيد المعلق */}
      <div className="relative overflow-hidden rounded-xl border border-orange-200 bg-linear-to-br from-orange-50 to-orange-100 p-6">
        <div className="absolute -right-8 -top-8 text-8xl text-orange-200 opacity-10">
          <FaHourglass />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-orange-600 p-3 text-white">
              <FaHourglass className="text-xl" />
            </div>
            <p className="text-sm font-medium text-orange-600">الرصيد المعلق</p>
          </div>
          <p className="mt-4 text-3xl font-bold text-orange-900">
            {formatCurrency(pendingBalance)}
          </p>
          <p className="mt-2 text-xs text-orange-700">
            في انتظار التحقق من الطلبات
          </p>
        </div>
      </div>

      {/* الأرباح الجاهزة للسحب */}
      <div className="relative overflow-hidden rounded-xl border border-green-200 bg-linear-to-br from-green-50 to-green-100 p-6">
        <div className="absolute -right-8 -top-8 text-8xl text-green-200 opacity-10">
          <FaMoneyBillWave />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-600 p-3 text-white">
              <FaMoneyBillWave className="text-xl" />
            </div>
            <p className="text-sm font-medium text-green-600">جاهز للسحب</p>
          </div>
          <p className="mt-4 text-3xl font-bold text-green-900">
            {formatCurrency(readyToWithdraw)}
          </p>
          <button className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-green-700 hover:shadow-lg">
            سحب الآن
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceSection;
