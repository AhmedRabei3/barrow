import { z } from "zod";
import type { AdminDashboardQueryDto } from "@/features/admin/dashboard/types";

const statusSchema = z.enum(["ALL", "ACTIVE", "INACTIVE", "BLOCKED"]);
const repeatSchema = z.enum(["ALL", "YES", "NO"]);
const sortBySchema = z.enum([
  "name",
  "status",
  "balance",
  "activeInvitedCount",
  "rechargeCount",
  "activeForDays",
]);
const sortDirectionSchema = z.enum(["asc", "desc"]);

const adminDashboardQuerySchema = z
  .object({
    search: z.string().optional().default(""),
    status: z.string().optional().default("ALL"),
    repeat: z.string().optional().default("ALL"),
    sortBy: z.string().optional().default("name"),
    sortDirection: z.string().optional().default("asc"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(5).max(50).default(12),
    lowEarningsThreshold: z.coerce.number().min(0).default(20),
    userId: z
      .string()
      .trim()
      .optional()
      .transform((value) => value || undefined),
    includeTimeline: z
      .union([
        z.literal("1"),
        z.literal("true"),
        z.literal("0"),
        z.literal("false"),
      ])
      .optional()
      .transform((value) => value === "1" || value === "true"),
  })
  .transform<AdminDashboardQueryDto>((value) => ({
    search: value.search.trim(),
    status: statusSchema.parse(value.status.toUpperCase()),
    repeat: repeatSchema.parse(value.repeat.toUpperCase()),
    sortBy: sortBySchema.parse(value.sortBy),
    sortDirection: sortDirectionSchema.parse(value.sortDirection.toLowerCase()),
    page: value.page,
    pageSize: value.pageSize,
    lowEarningsThreshold: value.lowEarningsThreshold,
    selectedUserId: value.userId,
    includeTimeline: value.includeTimeline,
  }));

export function parseAdminDashboardQuery(
  searchParams: URLSearchParams,
): AdminDashboardQueryDto {
  return adminDashboardQuerySchema.parse(
    Object.fromEntries(searchParams.entries()),
  );
}
