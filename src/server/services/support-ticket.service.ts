import { Errors } from "@/app/api/lib/errors/errors";
import type {
  SupportAdminMessageDto,
  SupportBroadcastAudience,
  SupportTicketDetailDto,
  SupportTicketListItemDto,
} from "@/features/support/types";
import { supportTicketRepository } from "@/server/repositories/support-ticket.repository";

export const supportTicketService = {
  async listUserTickets(userId: string): Promise<{
    tickets: SupportTicketListItemDto[];
    openCount: number;
  }> {
    const tickets = await supportTicketRepository.listUserTickets(userId);

    const items = tickets.map<SupportTicketListItemDto>((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      lastMessage: ticket.messages[0]?.body ?? "",
      lastSenderRole: ticket.messages[0]?.senderRole ?? "USER",
    }));

    return {
      tickets: items,
      openCount: items.filter((ticket) => ticket.status === "OPEN").length,
    };
  },

  async getUserTicketDetail(
    userId: string,
    ticketId: string,
  ): Promise<SupportTicketDetailDto> {
    const ticket = await supportTicketRepository.findUserTicketDetail(
      userId,
      ticketId,
    );

    if (!ticket) {
      throw Errors.NOT_FOUND("Support ticket not found");
    }

    return {
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messages: ticket.messages.map((message) => ({
        id: message.id,
        senderRole: message.senderRole,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      })),
    };
  },

  async replyToUserTicket(userId: string, ticketId: string, message: string) {
    const ticket = await supportTicketRepository.findTicketForUser(
      ticketId,
      userId,
    );

    if (!ticket) {
      throw Errors.NOT_FOUND("Support ticket not found");
    }

    await supportTicketRepository.createUserReply(ticket.id, userId, message);
  },

  async createTicket(
    userId: string,
    subject: string,
    message: string,
    isArabic: boolean,
  ) {
    const [sender, admins] =
      await supportTicketRepository.findSenderWithAdmins(userId);

    if (!sender) {
      throw Errors.NOT_FOUND("User not found");
    }

    const ticket = await supportTicketRepository.createTicket(
      sender.id,
      subject,
      message,
    );

    if (admins.length > 0) {
      const fromLabel = isArabic ? "من" : "From";
      const subjectLabel = isArabic ? "العنوان" : "Subject";
      const ticketLabel = isArabic ? "رقم التذكرة" : "Ticket ID";
      const title = isArabic ? "📩 رسالة دعم جديدة" : "📩 New support ticket";
      const body = `${fromLabel}: ${sender.name || "-"} (${sender.email})\n${subjectLabel}: ${subject}\n${ticketLabel}: ${ticket.id}`;

      await Promise.all(
        admins.map((admin) =>
          supportTicketRepository.createNotification(admin.id, title, body),
        ),
      );
    }
  },

  async listAdminMessages(): Promise<SupportAdminMessageDto[]> {
    const tickets = await supportTicketRepository.listAdminMessages();

    return tickets.map((ticket) => ({
      id: ticket.id,
      senderUserId: ticket.user.id,
      senderName: ticket.user.name,
      senderEmail: ticket.user.email,
      subject: ticket.subject,
      message: ticket.messages[0]?.body ?? "",
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    }));
  },

  async replyAsAdmin(
    adminId: string,
    ticketId: string,
    recipientUserId: string,
    subject: string,
    message: string,
    isArabic: boolean,
  ) {
    const ticket = await supportTicketRepository.findTicketForAdmin(ticketId);

    if (!ticket || ticket.userId !== recipientUserId) {
      throw Errors.NOT_FOUND("Support ticket not found");
    }

    await supportTicketRepository.createAdminReplyAndCloseTicket(
      ticket.id,
      adminId,
      recipientUserId,
      subject,
      message,
      isArabic,
    );
  },

  async broadcast(
    audience: SupportBroadcastAudience,
    subject: string,
    message: string,
  ) {
    const recipients =
      await supportTicketRepository.findBroadcastRecipients(audience);

    if (recipients.length === 0) {
      throw Errors.NOT_FOUND("No matching users were found for this broadcast");
    }

    await supportTicketRepository.createBroadcastNotifications(
      recipients.map((recipient) => recipient.id),
      subject,
      message,
    );

    return recipients.length;
  },
};
