import * as FaIcons from "react-icons/fa";
import * as AiIcons from "react-icons/ai";
import * as MdIcons from "react-icons/md";
import * as BiIcons from "react-icons/bi";
import * as IoIcons from "react-icons/io";
import * as CiIcons from "react-icons/ci";
import * as GiIcons from "react-icons/gi";
import * as BsIcons from "react-icons/bs";
import * as TbIcons from "react-icons/tb";
import * as RiIcons from "react-icons/ri";
import * as HiIcons from "react-icons/hi";
import * as SiIcons from "react-icons/si";
import * as CgIcons from "react-icons/cg";
import { IconType } from "react-icons";

// تجميع كل الأيقونات بمكتبة وحدة
export const icons: Record<string, Record<string, IconType>> = {
  Fa: FaIcons,
  Ai: AiIcons,
  Md: MdIcons,
  Bi: BiIcons,
  Io: IoIcons,
  Ci: CiIcons,
  Gi: GiIcons,
  Bs: BsIcons,
  Tb: TbIcons,
  Ri: RiIcons,
  Hi: HiIcons,
  Si: SiIcons,
  Cg: CgIcons,
};

interface DynamicIconInterface {
  iconName?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

export function DynamicIcon({
  iconName,
  size,
  className,
  onClick,
}: DynamicIconInterface) {
  if (!iconName) return null;

  // استخراج prefix (Fa / Md / Ai ..)
  const prefix = iconName.substring(0, 2);
  const IconSet = icons[prefix];
  const Icon = IconSet ? IconSet[iconName] : null;

  if (!Icon) return null;

  return <Icon size={size || 24} className={className} onClick={onClick} />;
}
