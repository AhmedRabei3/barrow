"use client";

import { memo } from "react";
import {
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

interface PaginationProps {
  itemsCount: number; // totalItems من السيرفر
  itemsPerPage?: number;
  setPage: (page: number) => void;
  currentPage?: number;
  maxPagesToShow?: number; // عدد الصفحات الظاهرة قبل ظهور النقاط
}

const Pagination = ({
  itemsCount,
  itemsPerPage = 10,
  setPage,
  currentPage = 1,
  maxPagesToShow = 10,
}: PaginationProps) => {
  const totalPages = Math.ceil(itemsCount / itemsPerPage);

  if (totalPages <= 1) return null; // إخفاء الباجينيشن إذا صفحة واحدة فقط

  const startPage =
    Math.floor((currentPage - 1) / maxPagesToShow) * maxPagesToShow + 1;
  const endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);

  const pages = [];
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  const showPrevDots = startPage > 1;
  const showNextDots = endPage < totalPages;

  return (
    <div className="flex justify-center items-center mt-4" dir="ltr">
      <div className="flex justify-center my-6 space-x-1">
        {/* First & Prev */}
        <button
          onClick={() => setPage(1)}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-xl disabled:opacity-50"
        >
          <FaAngleDoubleLeft size={14} />
        </button>
        <button
          onClick={() => setPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-xl disabled:opacity-50"
        >
          <FaChevronLeft size={14} />
        </button>

        {/* Prev dots */}
        {showPrevDots && (
          <button
            onClick={() => setPage(startPage - 1)}
            className="px-2 py-1 text-slate-500 dark:text-slate-300 cursor-pointer"
          >
            ...
          </button>
        )}

        {/* Page numbers */}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => setPage(page)}
            className={`px-3 py-1 border rounded-xl transition-all ${
              currentPage === page
                ? "bg-sky-500 text-white"
                : "bg-white dark:bg-slate-700 text-slate-700 dark:text-white border-slate-300 dark:border-slate-600 hover:bg-sky-100 dark:hover:bg-slate-600"
            }`}
          >
            {page}
          </button>
        ))}

        {/* Next dots */}
        {showNextDots && (
          <button
            onClick={() => setPage(endPage + 1)}
            className="px-2 py-1 text-slate-500 dark:text-slate-300 cursor-pointer"
          >
            ...
          </button>
        )}

        {/* Next & Last */}
        <button
          onClick={() => setPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-xl disabled:opacity-50"
        >
          <FaChevronRight size={14} />
        </button>
        <button
          onClick={() => setPage(totalPages)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-xl disabled:opacity-50"
        >
          <FaAngleDoubleRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default memo(Pagination);
