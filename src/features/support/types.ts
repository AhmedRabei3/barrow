export type SupportTicketListItemDto = {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  lastSenderRole: "USER" | "ADMIN";
};

export type SupportTicketMessageDto = {
  id: string;
  senderRole: "USER" | "ADMIN";
  body: string;
  createdAt: string;
};

export type SupportTicketDetailDto = {
  id: string;
  subject: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessageDto[];
};

export type SupportAdminMessageDto = {
  id: string;
  senderUserId: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  status: "OPEN" | "CLOSED";
  createdAt: string;
};

export type SupportBroadcastAudience = "ALL" | "ACTIVE";
