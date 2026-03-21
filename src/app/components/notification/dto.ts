import { NotificationType } from "@prisma/client";

export interface NotificationDTO {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationCounterDTO {
  unreadCount: number;
}           
