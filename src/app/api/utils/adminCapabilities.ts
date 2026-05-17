import { Errors } from "@/app/api/lib/errors/errors";

export type AdminCapability =
  | "USER_MANAGEMENT"
  | "FINANCE_REPORTS"
  | "FINANCE_OPERATIONS"
  | "MODERATION"
  | "SUPPORT"
  | "KYC_REVIEW"
  | "SYSTEM_SETTINGS";

export const ALL_ADMIN_CAPABILITIES: AdminCapability[] = [
  "USER_MANAGEMENT",
  "FINANCE_REPORTS",
  "FINANCE_OPERATIONS",
  "MODERATION",
  "SUPPORT",
  "KYC_REVIEW",
  "SYSTEM_SETTINGS",
];

type AdminIdentity = {
  id: string;
  email?: string | null;
  isAdmin?: boolean | null;
  isOwner?: boolean | null;
};

const capabilityEnvMap: Record<AdminCapability, string> = {
  USER_MANAGEMENT: "ADMIN_CAP_USER_MANAGEMENT",
  FINANCE_REPORTS: "ADMIN_CAP_FINANCE_REPORTS",
  FINANCE_OPERATIONS: "ADMIN_CAP_FINANCE_OPERATIONS",
  MODERATION: "ADMIN_CAP_MODERATION",
  SUPPORT: "ADMIN_CAP_SUPPORT",
  KYC_REVIEW: "ADMIN_CAP_KYC_REVIEW",
  SYSTEM_SETTINGS: "ADMIN_CAP_SYSTEM_SETTINGS",
};

const parseAllowList = (raw: string | undefined): Set<string> => {
  if (!raw) return new Set();

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
};

const isAllowedByList = (admin: AdminIdentity, allowList: Set<string>) => {
  if (allowList.size === 0) {
    return true;
  }

  const email = admin.email?.trim().toLowerCase();
  const id = admin.id.trim().toLowerCase();

  return Boolean((email && allowList.has(email)) || allowList.has(id));
};

export const hasAdminCapability = (
  admin: AdminIdentity,
  capability: AdminCapability,
): boolean => {
  if (!admin?.isAdmin) return false;
  if (admin.isOwner) return true;

  const envKey = capabilityEnvMap[capability];
  const allowList = parseAllowList(process.env[envKey]);

  return isAllowedByList(admin, allowList);
};

export const assertAdminCapability = (
  admin: AdminIdentity,
  capability: AdminCapability,
  localizedMessage?: string,
): void => {
  if (hasAdminCapability(admin, capability)) {
    return;
  }

  throw Errors.FORBIDDEN(localizedMessage || "Access denied");
};

export const resolveAdminCapabilities = (
  admin: AdminIdentity,
): Record<AdminCapability, boolean> => {
  const entries = ALL_ADMIN_CAPABILITIES.map((capability) => [
    capability,
    hasAdminCapability(admin, capability),
  ]);

  return Object.fromEntries(entries) as Record<AdminCapability, boolean>;
};
