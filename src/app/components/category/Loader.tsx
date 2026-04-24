const Loader = ({ isArabic }: { isArabic: boolean }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-transparent" />
      <p className="animate-pulse text-sm text-neutral-500">
        {isArabic ? "جارٍ التحميل..." : "Loading ..."}
      </p>
    </div>
  );
};

export default Loader;
