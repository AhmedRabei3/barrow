import { z } from "zod";

const trimmedRequired = (field: string, max: number) =>
  z
    .string({ error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} exceeds maximum length`);

export const createSupportTicketSchema = z.object({
  subject: trimmedRequired("Subject", 120),
  message: trimmedRequired("Message", 2000),
});

export const replyToSupportTicketSchema = z.object({
  message: trimmedRequired("Message", 2000),
});

export const adminReplyToSupportTicketSchema = z.object({
  ticketId: z.string().trim().min(1, "ticketId is required"),
  recipientUserId: z.string().trim().min(1, "User ID is required"),
  subject: trimmedRequired("Subject", 120),
  message: trimmedRequired("Message", 2000),
});

export const broadcastSupportSchema = z.object({
  subject: trimmedRequired("Subject", 120),
  message: trimmedRequired("Message", 2000),
  audience: z.enum(["ALL", "ACTIVE"]).default("ALL"),
});
