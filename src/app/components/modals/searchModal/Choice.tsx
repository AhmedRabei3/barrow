"use client";
import QuestionContainer from "./Question";

interface ChoiceOption<T = string> {
  value: T;
  label: string;
}

interface ChoiceProps<T = string> {
  question: string;
  options: readonly ChoiceOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

const Choice = <T extends string>({
  question,
  options,
  selected,
  onSelect,
}: ChoiceProps<T>) => {
  return (
    <QuestionContainer title={question}>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isActive = opt.value === selected;
          return (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-linear-to-r from-blue-500 to-indigo-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </QuestionContainer>
  );
};
export default Choice;
