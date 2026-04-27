"use client";

import { useEffect, useState } from "react";
import { IconType } from "react-icons";

type IconSetModule = Record<string, IconType>;

const toIconSetModule = (moduleLike: Record<string, unknown>): IconSetModule =>
  Object.fromEntries(
    Object.entries(moduleLike).filter(
      ([name, exported]) =>
        name !== "default" && typeof exported === "function",
    ),
  ) as IconSetModule;

const iconSetLoaders: Record<string, () => Promise<IconSetModule>> = {
  Fa: () => import("react-icons/fa").then((mod) => toIconSetModule(mod)),
  Ai: () => import("react-icons/ai").then((mod) => toIconSetModule(mod)),
  Md: () => import("react-icons/md").then((mod) => toIconSetModule(mod)),
  Bi: () => import("react-icons/bi").then((mod) => toIconSetModule(mod)),
  Io: () => import("react-icons/io").then((mod) => toIconSetModule(mod)),
  Ci: () => import("react-icons/ci").then((mod) => toIconSetModule(mod)),
  Gi: () => import("react-icons/gi").then((mod) => toIconSetModule(mod)),
  Bs: () => import("react-icons/bs").then((mod) => toIconSetModule(mod)),
  Tb: () => import("react-icons/tb").then((mod) => toIconSetModule(mod)),
  Ri: () => import("react-icons/ri").then((mod) => toIconSetModule(mod)),
  Hi: () => import("react-icons/hi").then((mod) => toIconSetModule(mod)),
  Si: () => import("react-icons/si").then((mod) => toIconSetModule(mod)),
  Cg: () => import("react-icons/cg").then((mod) => toIconSetModule(mod)),
};

const loadedSets = new Map<string, IconSetModule>();
const resolvedIcons = new Map<string, IconType | null>();

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
  const [Icon, setIcon] = useState<IconType | null>(null);

  const iconSize = size || 24;

  useEffect(() => {
    let isCancelled = false;

    if (!iconName) {
      setIcon(null);
      return;
    }

    const cachedIcon = resolvedIcons.get(iconName);
    if (cachedIcon !== undefined) {
      setIcon(() => cachedIcon);
      return;
    }

    const prefix = iconName.substring(0, 2);
    const loadSet = iconSetLoaders[prefix];

    if (!loadSet) {
      resolvedIcons.set(iconName, null);
      setIcon(null);
      return;
    }

    const resolveIcon = async () => {
      let iconSet = loadedSets.get(prefix);

      if (!iconSet) {
        iconSet = await loadSet();
        loadedSets.set(prefix, iconSet);
      }

      const resolved = iconSet[iconName] ?? null;
      resolvedIcons.set(iconName, resolved);

      if (!isCancelled) {
        setIcon(() => resolved);
      }
    };

    void resolveIcon();

    return () => {
      isCancelled = true;
    };
  }, [iconName]);

  if (!iconName) return null;

  if (!Icon) {
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{ width: iconSize, height: iconSize, display: "inline-block" }}
      />
    );
  }

  return <Icon size={iconSize} className={className} onClick={onClick} />;
}
