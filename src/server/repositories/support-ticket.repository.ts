import {
  NotificationType,
  SupportSenderRole,
  SupportTicketStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const supportTicketRepository = {
  listUserTickets(userId: string) {
    return prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            body: true,
            senderRole: true,
          },
        },
      },
    });
  },

  findUserTicketDetail(userId: string, ticketId: string) {
    return prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            senderRole: true,
            body: true,
            createdAt: true,
          },
        },
      },
    });
  },

  findTicketForUser(ticketId: string, userId: string) {
    return prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        userId,
      },
      select: {
        id: true,
      },
    });
  },

  createUserReply(ticketId: string, userId: string, message: string) {
    return prisma.$transaction(async (tx) => {
      await tx.supportTicketMessage.create({
        data: {
          ticketId,
          senderId: userId,
          senderRole: SupportSenderRole.USER,
          body: message,
        },
      });

      await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: SupportTicketStatus.OPEN },
      });
    });
  },

  findSenderWithAdmins(userId: string) {
    return Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      }),
      prisma.user.findMany({
        where: { isAdmin: true, isDeleted: false },
        select: { id: true },
      }),
    ]);
  },

  createTicket(userId: string, subject: string, message: string) {
    return prisma.supportTicket.create({
      data: {
        userId,
        subject,
        messages: {
          create: {
            senderId: userId,
            senderRole: SupportSenderRole.USER,
            body: message,
          },
        },
      },
      select: {
        id: true,
      },
    });
  },

  createNotification(userId: string, title: string, message: string) {
    return prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: NotificationType.INFO,
      },
    });
  },

  listAdminMessages() {
    return prisma.supportTicket.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          where: { senderRole: SupportSenderRole.USER },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            body: true,
          },
        },
      },
    });
  },

  findTicketForAdmin(ticketId: string) {
    return prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        userId: true,
      },
    });
  },

  createAdminReplyAndCloseTicket(
    ticketId: string,
    adminId: string,
    recipientUserId: string,
    subject: string,
    message: string,
    isArabic: boolean,
  ) {
    const titlePrefix = isArabic
      ? "📬 رد من خدمة العملاء"
      : "📬 Reply from customer service";

    return prisma.$transaction(async (tx) => {
      await tx.supportTicketMessage.create({
        data: {
          ticketId,
          senderId: adminId,
          senderRole: SupportSenderRole.ADMIN,
          body: message,
        },
      });

      await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: SupportTicketStatus.CLOSED },
      });

      await tx.notification.create({
        data: {
          userId: recipientUserId,
          title: `${titlePrefix}: ${subject}`,
          message,
          type: NotificationType.INFO,
        },
      });
    });
  },

  findBroadcastRecipients(audience: "ALL" | "ACTIVE") {
    return prisma.user.findMany({
      where: {
        isDeleted: false,
        ...(audience === "ACTIVE" ? { isActive: true } : {}),
      },
      select: { id: true },
    });
  },

  createBroadcastNotifications(
    recipientIds: string[],
    subject: string,
    message: string,
  ) {
    return prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
        title: `📢 ${subject}`,
        message,
        type: NotificationType.INFO,
      })),
    });
  },
};
