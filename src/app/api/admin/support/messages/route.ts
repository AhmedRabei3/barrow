import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/app/api/utils/authHelper";
import { handleApiError } from "@/app/api/lib/errors/errorHandler";
import { supportTicketService } from "@/server/services/support-ticket.service";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser();
    const messages = await supportTicketService.listAdminMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    return handleApiError(error, req);
  }
}
