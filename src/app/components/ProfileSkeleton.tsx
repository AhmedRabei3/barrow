import React from "react";
import Skeleton from "./ui/skeleton";
import Container from "./Container";

export const ProfileSkeleton: React.FC = () => {
  return (
    <Container>
      <div className="space-y-8 py-8">
        {/* Profile Header Skeleton */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Avatar Skeleton */}
            <Skeleton className="h-32 w-32 rounded-full" />

            {/* Info Skeleton */}
            <div className="space-y-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-5 w-40" />
            </div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-950 p-6"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>

        {/* Content Section Skeleton */}
        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-950 p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Items List Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="space-y-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-950 p-4"
              >
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ProfileSkeleton;
