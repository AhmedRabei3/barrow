import { PlatformProfitLedgerType, Prisma } from "@prisma/client";

type PlatformProfitLedgerClient = {
  platformProfitLedger: {
    create: (args: Prisma.PlatformProfitLedgerCreateArgs) => Promise<unknown>;
  };
};

export type PlatformProfitLedgerEntryInput = {
  type: PlatformProfitLedgerType;
  amount: number;
  userId?: string | null;
  referenceId?: string | null;
  note?: string | null;
  createdAt?: Date;
};

const roundMoney = (value: number) => Number(value.toFixed(2));

export const recordPlatformProfitLedgerEntries = async (
  client: PlatformProfitLedgerClient,
  entries: PlatformProfitLedgerEntryInput[],
) => {
  const normalizedEntries = entries
    .map((entry) => ({
      ...entry,
      amount: roundMoney(Number(entry.amount || 0)),
    }))
    .filter((entry) => Number.isFinite(entry.amount) && entry.amount !== 0);

  await Promise.all(
    normalizedEntries.map((entry) =>
      client.platformProfitLedger.create({
        data: {
          type: entry.type,
          amount: entry.amount,
          userId: entry.userId ?? undefined,
          referenceId: entry.referenceId ?? undefined,
          note: entry.note ?? undefined,
          createdAt: entry.createdAt,
        },
      }),
    ),
  );
};
