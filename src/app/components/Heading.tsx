"use client";

interface HeadingProps {
  title: string;
  subtitle?: string;
  center?: boolean;
}

const Heading: React.FC<HeadingProps> = ({ title, subtitle, center }) => {
  return (
    <div className={center ? "text-center" : "text-start"}>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        {title}
      </div>
      <div className="font-normal text-slate-600 dark:text-slate-300 mt-1">
        {subtitle}
      </div>
    </div>
  );
};

export default Heading;
