import type { AtlasData } from "./data";

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

/** What the assistant is given to talk back through while it answers. */
export interface AssistantReplyHandlers {
  /** Receives the reply piece by piece, as it is produced. */
  onText: (piece: string) => void;
  /**
   * Asks the person to allow a change before it is made, described in plain
   * words. Resolves to true only if they allowed it. An engine that changes
   * anything must ask here first, every time.
   */
  confirm: (summary: string) => Promise<boolean>;
  /** Told what the engine is doing while it works: "Looking at your tasks". */
  onActivity?: (what: string) => void;
}

/** Whatever produces the assistant's answers. */
export interface AssistantEngine {
  /**
   * Answers the conversation so far (the last message is the user's).
   * Rejects if no answer could be given.
   */
  reply(
    conversation: AssistantMessage[],
    handlers: AssistantReplyHandlers,
  ): Promise<void>;
}

/**
 * How an app reaches whatever answers for the assistant. The key that pays
 * for the answers is saved and removed through here and can never be read
 * back; each platform keeps it somewhere the interface code cannot reach.
 */
export interface AssistantAccess {
  hasKey(): Promise<boolean>;
  saveKey(key: string): Promise<void>;
  removeKey(): Promise<void>;
  /** The engine that answers, working in the given workspace. */
  createEngine(data: AtlasData, workspaceId: string): AssistantEngine;
}
