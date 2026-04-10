import { loadEnvConfig } from "@next/env";
import { ItemType, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

loadEnvConfig(process.cwd());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const POLL_INTERVAL_MS = parsePositiveInt(
  process.env.RENTAL_REMINDER_POLL_MS,
  30 * 60 * 1000,
);
const LOOKAHEAD_HOURS = parsePositiveInt(
  process.env.RENTAL_REMINDER_LOOKAHEAD_HOURS,
  24,
);
const DEDUPE_WINDOW_HOURS = parsePositiveInt(
  process.env.RENTAL_REMINDER_DEDUPE_HOURS,
  LOOKAHEAD_HOURS,
);
const RUN_ONCE = process.env.RENTAL_REMINDER_RUN_ONCE === "1";

type RentalTransaction = {
  id: string;
  itemId: string;
  itemType: ItemType;
  ownerId: string;
  clientId: string;
  endDate: Date | null;
};

const formatEndDate = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

const getItemLabel = async (itemType: ItemType, itemId: string) => {
  switch (itemType) {
    case "NEW_CAR": {
      const item = await prisma.newCar.findUnique({
        where: { id: itemId },
        select: { brand: true, model: true },
      });
      return [item?.brand, item?.model].filter(Boolean).join(" ") || "listing";
    }
    case "USED_CAR": {
      const item = await prisma.oldCar.findUnique({
        where: { id: itemId },
        select: { brand: true, model: true },
      });
      return [item?.brand, item?.model].filter(Boolean).join(" ") || "listing";
    }
    case "PROPERTY": {
      const item = await prisma.property.findUnique({
        where: { id: itemId },
        select: { title: true },
      });
      return item?.title || "property";
    }
    case "OTHER": {
      const item = await prisma.otherItem.findUnique({
        where: { id: itemId },
        select: { name: true, brand: true },
      });
      return (
        [item?.brand, item?.name].filter(Boolean).join(" ") ||
        item?.name ||
        "item"
      );
    }
  }
};

const createReminderIfMissing = async ({
  userId,
  title,
  message,
  createdAfter,
}: {
  userId: string;
  title: string;
  message: string;
  createdAfter: Date;
}) => {
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      title,
      message,
      createdAt: {
        gte: createdAfter,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type: "INFO",
    },
  });

  return true;
};

const processUpcomingRentals = async () => {
  const now = new Date();
  const upcomingDeadline = new Date(
    now.getTime() + LOOKAHEAD_HOURS * 60 * 60 * 1000,
  );
  const dedupeThreshold = new Date(
    now.getTime() - DEDUPE_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const transactions = await prisma.transaction.findMany({
    where: {
      type: TransactionType.RENT,
      status: {
        in: [TransactionStatus.APPROVED, TransactionStatus.COMPLETED],
      },
      endDate: {
        gt: now,
        lte: upcomingDeadline,
      },
    },
    select: {
      id: true,
      itemId: true,
      itemType: true,
      ownerId: true,
      clientId: true,
      endDate: true,
    },
  });

  let notificationsCreated = 0;

  for (const transaction of transactions as RentalTransaction[]) {
    if (!transaction.endDate) {
      continue;
    }

    const itemLabel = await getItemLabel(
      transaction.itemType,
      transaction.itemId,
    );
    const formattedEndDate = formatEndDate(transaction.endDate);
    const ownerTitle = "Rental ending soon | انتهاء الإيجار قريباً";
    const ownerMessage = `${itemLabel} ends on ${formattedEndDate}. Confirm return or renewal, then update the listing status. | ينتهي ${itemLabel} بتاريخ ${formattedEndDate}. راجع التسليم أو التجديد ثم حدّث حالة الإعلان.`;
    const renterTitle = "Your rental is ending soon | إيجارك سينتهي قريباً";
    const renterMessage = `${itemLabel} ends on ${formattedEndDate}. Please coordinate return or extension with the owner. | ينتهي ${itemLabel} بتاريخ ${formattedEndDate}. يرجى التنسيق مع المالك للإرجاع أو التمديد.`;

    const ownerReminderPromise = createReminderIfMissing({
      userId: transaction.ownerId,
      title: ownerTitle,
      message: ownerMessage,
      createdAfter: dedupeThreshold,
    });

    const renterReminderPromise =
      transaction.clientId === transaction.ownerId
        ? Promise.resolve(false)
        : createReminderIfMissing({
            userId: transaction.clientId,
            title: renterTitle,
            message: renterMessage,
            createdAfter: dedupeThreshold,
          });

    const [ownerCreated, renterCreated] = await Promise.all([
      ownerReminderPromise,
      renterReminderPromise,
    ]);

    notificationsCreated += Number(ownerCreated) + Number(renterCreated);
  }

  return {
    scanned: transactions.length,
    notificationsCreated,
  };
};

const runWorker = async () => {
  console.log("Rental reminder worker started");
  console.log(
    `Polling every ${POLL_INTERVAL_MS}ms with a ${LOOKAHEAD_HOURS}h lookahead window`,
  );

  if (RUN_ONCE) {
    const result = await processUpcomingRentals();
    console.log(
      `Rental reminder one-shot complete. Scanned=${result.scanned} Notifications=${result.notificationsCreated}`,
    );
    return;
  }

  for (;;) {
    try {
      const result = await processUpcomingRentals();
      console.log(
        `Rental reminder tick complete. Scanned=${result.scanned} Notifications=${result.notificationsCreated}`,
      );
    } catch (error) {
      console.error("Rental reminder worker loop error:", error);
    }

    await sleep(POLL_INTERVAL_MS);
  }
};

runWorker()
  .catch((error) => {
    console.error("Failed to start rental reminder worker:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
