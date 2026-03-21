// server/services/validationService.ts
import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema, data: unknown) {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    return {
      ok: false,
      error: NextResponse.json(
        { success: false, errors: parsed.error.issues },
        { status: 400 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
