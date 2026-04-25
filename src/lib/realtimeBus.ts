import { EventEmitter } from "events";

export type RealtimeNotificationEvent = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
};

type RealtimeBus = EventEmitter & {
  emit: (event: "notification", payload: RealtimeNotificationEvent) => boolean;
  on: (
    event: "notification",
    listener: (payload: RealtimeNotificationEvent) => void,
  ) => RealtimeBus;
  off: (
    event: "notification",
    listener: (payload: RealtimeNotificationEvent) => void,
  ) => RealtimeBus;
};

const globalBus = globalThis as typeof globalThis & {
  __mashhoorRealtimeBus?: RealtimeBus;
};

export const realtimeBus: RealtimeBus =
  globalBus.__mashhoorRealtimeBus || (new EventEmitter() as RealtimeBus);

realtimeBus.setMaxListeners(0);

globalBus.__mashhoorRealtimeBus = realtimeBus;
