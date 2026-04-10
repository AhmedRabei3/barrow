import {
  Availability,
  ItemType,
  RentType,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { Prisma } from "@prisma/client";
import { Errors } from "../lib/errors/errors";

const MANUAL_RENTAL_STATUSES = [
  TransactionStatus.PENDING,
  TransactionStatus.APPROVED,
  TransactionStatus.COMPLETED,
] as const;

const addRentalPeriods = (
  startDate: Date,
  rentType: RentType,
  periods: number,
) => {
  const endDate = new Date(startDate);

  switch (rentType) {
    case "DAILY":
      endDate.setDate(endDate.getDate() + periods);
      return endDate;
    case "WEEKLY":
      endDate.setDate(endDate.getDate() + periods * 7);
      return endDate;
    case "MONTHLY":
      endDate.setMonth(endDate.getMonth() + periods);
      return endDate;
    case "YEARLY":
      endDate.setFullYear(endDate.getFullYear() + periods);
      return endDate;
  }
};

export const parseManualRentalPeriods = (value: FormDataEntryValue | null) => {
  if (value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.floor(parsed);
};

type SyncManualRentalArgs = {
  tx: {
    transaction: {
      findMany: (
        args: Prisma.TransactionFindManyArgs,
      ) => Promise<Array<{ id: string }>>;
      update: (args: Prisma.TransactionUpdateArgs) => Promise<unknown>;
      updateMany: (args: Prisma.TransactionUpdateManyArgs) => Promise<unknown>;
      create: (args: Prisma.TransactionCreateArgs) => Promise<unknown>;
    };
  };
  itemId: string;
  itemType: ItemType;
  ownerId: string;
  nextStatus: Availability;
  nextSellOrRent: TransactionType;
  nextRentType: RentType | null;
  manualRentalPeriods?: number;
};

export async function syncManualRentalStatus({
  tx,
  itemId,
  itemType,
  ownerId,
  nextStatus,
  nextSellOrRent,
  nextRentType,
  manualRentalPeriods,
}: SyncManualRentalArgs) {
  const existingManualTransactions = await tx.transaction.findMany({
    where: {
      itemId,
      itemType,
      ownerId,
      clientId: ownerId,
      type: TransactionType.RENT,
      payment: null,
      status: {
        in: [...MANUAL_RENTAL_STATUSES],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
    },
  });

  const [latestManualTransaction, ...staleManualTransactions] =
    existingManualTransactions;

  if (staleManualTransactions.length > 0) {
    await tx.transaction.updateMany({
      where: {
        id: {
          in: staleManualTransactions.map((transaction) => transaction.id),
        },
      },
      data: {
        status: TransactionStatus.CANCELLED,
      },
    });
  }

  const shouldMarkAsManualRental =
    nextSellOrRent === TransactionType.RENT &&
    nextStatus === Availability.RENTED;

  if (!shouldMarkAsManualRental) {
    if (latestManualTransaction) {
      await tx.transaction.update({
        where: {
          id: latestManualTransaction.id,
        },
        data: {
          status: TransactionStatus.CANCELLED,
        },
      });
    }

    return { manualRentalEndsAt: null as Date | null };
  }

  if (!nextRentType) {
    throw Errors.VALIDATION(
      "نوع الإيجار مطلوب عند تعيين العنصر كمؤجر",
      "rentType",
    );
  }

  if (!manualRentalPeriods || manualRentalPeriods < 1) {
    throw Errors.VALIDATION(
      "مدة الإيجار اليدوي يجب أن تكون أكبر من صفر",
      "manualRentalPeriods",
    );
  }

  const startDate = new Date();
  const endDate = addRentalPeriods(
    startDate,
    nextRentType,
    manualRentalPeriods,
  );

  if (latestManualTransaction) {
    await tx.transaction.update({
      where: { id: latestManualTransaction.id },
      data: {
        type: TransactionType.RENT,
        rentType: nextRentType,
        startDate,
        endDate,
        status: TransactionStatus.APPROVED,
        totalPrice: new Prisma.Decimal(0),
        totalPlatformFee: new Prisma.Decimal(0),
      },
    });
  } else {
    await tx.transaction.create({
      data: {
        ownerId,
        clientId: ownerId,
        itemId,
        itemType,
        type: TransactionType.RENT,
        rentType: nextRentType,
        startDate,
        endDate,
        status: TransactionStatus.APPROVED,
        totalPrice: new Prisma.Decimal(0),
        totalPlatformFee: new Prisma.Decimal(0),
      },
    });
  }

  return {
    manualRentalEndsAt: endDate,
  };
}
