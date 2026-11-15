// The assistant, as the rest of ATLAS sees it. Nothing here knows which AI
// provider answers, or whether one is connected at all: an app is handed an
// AssistantEngine when there is one, and none when there is not.

export const ASSISTANT_MESSAGE_MAX_LENGTH = 4000;

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

/**
 * What the assistant is doing, which is also what its sphere shows.
 * "listening" belongs to voice input, which does not exist yet.
 */
export const ASSISTANT_STATUSES = [
  "idle",
  "listening",
  "thinking",
  "responding",
] as const;
export type AssistantStatus = (typeof ASSISTANT_STATUSES)[number];

/** Whatever produces the assistant's answers. */
export interface AssistantEngine {
  /**
   * Answers the conversation so far (the last message is the user's),
   * handing the reply over piece by piece as it is produced. Rejects if no
   * answer could be given.
   */
  reply(
    conversation: AssistantMessage[],
    onText: (piece: string) => void,
  ): Promise<void>;
}
