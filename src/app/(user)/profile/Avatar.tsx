import { DynamicIcon } from "@/app/components/addCategory/IconSetter";

interface Props {
  user?: {
    profileImage?: string | null;
    name?: string | null;
  };
  size?: number;
}

const Avatar = ({ user, size = 40 }: Props) => {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center overflow-hidden rounded-full bg-slate-100 ring-4 ring-primary/10 dark:bg-slate-800 shadow-sm"
    >
      {user?.profileImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.profileImage}
          alt={user.name || "User Avatar"}
          className="w-full h-full object-cover"
        />
      ) : (
        <DynamicIcon
          iconName="BiUser"
          size={Math.max(24, size * 0.45)}
          className="text-slate-300"
        />
      )}
    </div>
  );
};

export default Avatar;
