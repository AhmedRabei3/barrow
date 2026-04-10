"./style.css";

const RgbBorder = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <div className="card">
      {/* Children components can be added here */}
      {children}
    </div>
  );
};

export default RgbBorder;
