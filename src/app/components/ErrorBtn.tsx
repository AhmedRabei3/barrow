import React from "react";

const ErrorBtn = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen text-red-500">
      حدث خطأ أثناء تحميل البيانات
      <button
        onClick={() => window.location.reload()}
        className="mr-3 text-emerald-600 hover:underline"
      >
        أعد المحاولة
      </button>
    </div>
  );
};

export default ErrorBtn;
