export type ConversationKeyInput = {
  listingId: string;
  userAId: string;
  userBId: string;
};

export function buildChatConversationId({
  listingId,
  userAId,
  userBId,
}: ConversationKeyInput): string {
  const [first, second] = [userAId, userBId].sort();
  return `${listingId}_${first}_${second}`;
}
