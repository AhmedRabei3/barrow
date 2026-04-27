import { memo } from "react";
import Skeleton from "../ui/skeleton";

interface CardListSkeletonProps {
  count?: number;
}

const CardListSkeleton = ({ count = 10 }: CardListSkeletonProps) => {
  return (
    <div
      className="
        flex-1 w-full
        grid
        lg:grid-cols-5
        min-[1680px]:grid-cols-6
        md:grid-cols-3
        sm:grid-cols-1
        gap-x-5 gap-y-8 md:gap-x-6 md:gap-y-9 items-stretch
      "
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex h-full w-full">
          <div className="w-full overflow-hidden rounded-[18px] border border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-950/95">
            <div className="relative aspect-4/3 w-full">
              <Skeleton className="h-full w-full rounded-none" />
              <Skeleton className="absolute end-3 top-3 h-9 w-9 rounded-full" />
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1">
                <Skeleton className="h-1.5 w-7 rounded-full" />
                <Skeleton className="h-1.5 w-2 rounded-full" />
                <Skeleton className="h-1.5 w-2 rounded-full" />
                <Skeleton className="h-1.5 w-2 rounded-full" />
              </div>
            </div>
            <div className="space-y-3 px-4 py-4">
              <Skeleton className="h-5 w-2/3" />
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(CardListSkeleton);
