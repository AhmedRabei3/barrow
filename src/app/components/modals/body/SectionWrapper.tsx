const SectionWrapper = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <div className="border rounded-xl p-4 shadow-sm bg-white space-y-3">
      <h2 className="text-lg font-semibold text-neutral-700 border-b pb-2">{title}</h2>
      {children}
    </div>
  );
};

export default SectionWrapper;
