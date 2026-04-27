const CategorySliderSkeleton = () => {
  return (
    <div className="relative flex items-center gap-3 px-4 sm:px-8">
      <span className="h-9 w-9 rounded-full bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
      <div className="flex flex-1 gap-3 overflow-hidden">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="flex min-w-18 flex-col items-center gap-2 rounded-lg px-2 py-1"
          >
            <span className="h-8 w-8 rounded-full bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
            <span className="h-3 w-14 rounded bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
          </div>
        ))}
      </div>
      <span className="h-9 w-9 rounded-full bg-slate-200/80 dark:bg-slate-800/80 animate-pulse" />
    </div>
  );
};

export default CategorySliderSkeleton;
