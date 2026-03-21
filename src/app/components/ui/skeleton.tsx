import React from "react";

interface SkeletonProps {
  className?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  isLoading = true,
  children,
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div
      className={`animate-pulse rounded-md bg-linear-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 ${className}`}
    />
  );
};

export default Skeleton;
