"use client";

import { memo } from "react";

interface QuestionProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

const QuestionContainer = ({ title, description, children }: QuestionProps) => {
  return (
    <div className="p-2 rounded border bg-white shadow-sm space-y-2">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-sm text-neutral-500">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
};

export default memo(QuestionContainer);
