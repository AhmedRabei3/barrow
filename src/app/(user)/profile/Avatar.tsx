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
      className={`w-20 h-20 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden`}
    >
      {user?.profileImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.profileImage}
          alt={user.name || "User Avatar"}
          className="w-full h-full object-cover"
        />
      ) : (
        <DynamicIcon iconName="BiUser" size={size} />
      )}
    </div>
  );
};

export default Avatar;
