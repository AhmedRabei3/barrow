import { ItemType, RentType } from "@prisma/client";
import { Errors } from "../lib/errors/errors";
import { prisma } from "@/lib/prisma";

type RentableItem = {
  id: string;
  ownerId: string;
  status:
    | "PENDING_REVIEW"
    | "AVAILABLE"
    | "RESERVED"
    | "RENTED"
    | "SOLD"
    | "MAINTENANCE";
  rentType: RentType | null;
  price: number | { toString(): string };
};

type RentClient = {
  property: {
    findUnique: (args: {
      where: { id: string };
    }) => Promise<RentableItem | null>;
    update: (args: {
      where: { id: string };
      data: { status: RentableItem["status"] };
    }) => Promise<unknown>;
  };
  newCar: {
    findUnique: (args: {
      where: { id: string };
    }) => Promise<RentableItem | null>;
    update: (args: {
      where: { id: string };
      data: { status: RentableItem["status"] };
    }) => Promise<unknown>;
  };
  oldCar: {
    findUnique: (args: {
      where: { id: string };
    }) => Promise<RentableItem | null>;
    update: (args: {
      where: { id: string };
      data: { status: RentableItem["status"] };
    }) => Promise<unknown>;
  };
  otherItem: {
    findUnique: (args: {
      where: { id: string };
    }) => Promise<RentableItem | null>;
    update: (args: {
      where: { id: string };
      data: { status: RentableItem["status"] };
    }) => Promise<unknown>;
  };
};

type Args = {
  startDate: Date;
  endDate: Date;
  rentType: RentType | null;
};

export function calculateRentUnits({
  startDate,
  endDate,
  rentType,
}: Args): number {
  if (endDate <= startDate) {
    throw Errors.VALIDATION("فترة الإيجار غير صحيحة");
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  switch (rentType) {
    case "DAILY":
      return days;

    case "WEEKLY":
      return Math.ceil(days / 7);

    case "MONTHLY":
      return (
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth()) +
        1
      );

    case "YEARLY":
      return endDate.getFullYear() - startDate.getFullYear() + 1;

    default:
      throw Errors.VALIDATION("نوع الإيجار غير صالح");
  }
}

//------- transaction conflict ------------

interface transactionProps {
  itemId: string;
  itemType: ItemType;
  start: Date;
  end: Date;
}

export const assertNoTransactionConflict = async ({
  itemId,
  itemType,
  start,
  end,
}: transactionProps) => {
  const conflict = await prisma.transaction.findFirst({
    where: {
      itemId,
      itemType,
      status: {
        in: ["PENDING", "APPROVED"],
      },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  if (conflict) {
    throw Errors.VALIDATION("العنصر محجوز في هذه الفترة بالفعل");
  }
};

export async function getRentableItem(
  tx: RentClient,
  itemType: ItemType,
  itemId: string,
): Promise<RentableItem | null> {
  switch (itemType) {
    case "PROPERTY":
      return tx.property.findUnique({ where: { id: itemId } });
    case "NEW_CAR":
      return tx.newCar.findUnique({ where: { id: itemId } });
    case "USED_CAR":
      return tx.oldCar.findUnique({ where: { id: itemId } });
    case "OTHER":
      return tx.otherItem.findUnique({ where: { id: itemId } });
  }
}

export async function updateItemStatus(
  tx: RentClient,
  itemType: ItemType,
  itemId: string,
  status: RentableItem["status"],
) {
  switch (itemType) {
    case "PROPERTY":
      await tx.property.update({ where: { id: itemId }, data: { status } });
      return;
    case "NEW_CAR":
      await tx.newCar.update({ where: { id: itemId }, data: { status } });
      return;
    case "USED_CAR":
      await tx.oldCar.update({ where: { id: itemId }, data: { status } });
      return;
    case "OTHER":
      await tx.otherItem.update({ where: { id: itemId }, data: { status } });
      return;
  }
}
