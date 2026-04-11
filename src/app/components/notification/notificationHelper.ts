"use client";

export const markAsRead = async (id: string) => {
  await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
};

export function extractRequestId(message: string): string | null {
  const match = message.match(/([a-z0-9]{25})/i);
  return match ? match[1] : null;
}

export function extractShamCashRequestId(
  message: string,
  title?: string,
): string | null {
  const combined = `${title || ""}\n${message || ""}`;
  const tokenMatch = combined.match(/SCW_REQUEST_ID:([a-z0-9]{25})/i);
  if (tokenMatch?.[1]) {
    return tokenMatch[1];
  }

  const fallbackMatch = combined.match(/Request ID:\s*([a-z0-9]{25})/i);
  return fallbackMatch?.[1] || null;
}

export function extractShamCashActivationRequestId(
  message: string,
  title?: string,
): string | null {
  const combined = `${title || ""}\n${message || ""}`;
  const tokenMatch = combined.match(/SCA_REQUEST_ID:([a-z0-9]{25})/i);
  if (tokenMatch?.[1]) {
    return tokenMatch[1];
  }

  return null;
}

export function extractItemModerationTarget(message: string, title?: string) {
  const combined = `${title || ""}\n${message || ""}`;
  const tokenMatch = combined.match(
    /ITEM_MODERATION:(PROPERTY|NEW_CAR|USED_CAR|OTHER):([a-z0-9]{25,})/i,
  );

  if (!tokenMatch?.[1] || !tokenMatch?.[2]) {
    return null;
  }

  return {
    itemType: tokenMatch[1].toUpperCase(),
    itemId: tokenMatch[2],
  };
}
