import { z } from "zod";
import { ItemType } from "@prisma/client";

export const rentSchema = z
  .object({
    itemId: z.string().cuid("معرّف العنصر غير صالح"),
    itemType: z.nativeEnum(ItemType).catch(() => {
      throw new Error("نوع العنصر غير صالح");
    }),
    startDate: z.coerce
      .date()
      .refine(
        (date) => date > new Date(),
        "يجب أن يكون تاريخ البدء في المستقبل",
      ),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      const diffDays =
        (data.endDate.getTime() - data.startDate.getTime()) /
        (1000 * 60 * 60 * 24);
      return diffDays >= 1;
    },
    {
      message: "مدة الإيجار يجب أن تكون يومًا واحدًا على الأقل",
      path: ["endDate"],
    },
  );

export type RentSchemaType = z.infer<typeof rentSchema>;
