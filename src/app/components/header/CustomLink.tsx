import Link from "next/link";
import { DynamicIcon } from "../addCategory/IconSetter";

interface CustumLinkProps {
  href: string;
  label: string;
  iconName?: string;
}
const CustomLink = ({ href, label, iconName }: CustumLinkProps) => {
  return (
    <Link
      href={href}
      className="
        hover:bg-sky-50
        cursor-pointer
        transition
        duration-300
        px-2
        py-2
        opacity-90
        flex
        items-center
        gap-2
        rounded-lg
        justify-between
        w-full
       "
    >
      {label}
      <DynamicIcon iconName={iconName} size={16} className="text-sky-500 hover:rotate-6" />
    </Link>
  );
};

export default CustomLink;
