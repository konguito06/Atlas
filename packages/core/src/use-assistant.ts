import { useCallback, useRef, useState } from "react";
import type {
  AssistantEngine,
  AssistantMessage,
  AssistantStatus,
} from "./assistant";

/**
 * One conversation with the assistant. Without an engine nothing can be
 * sent; a message is never answered by anything but the engine.
 */
export function useAssistantConversation(engine: AssistantEngine | undefined) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [error, setError] = useState<string>();
  // The latest conversation and status, readable from inside a running send.
  const conversation = useRef<AssistantMessage[]>([]);
  const busy = useRef(false);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!engine || !question || busy.current) return;

      const show = (next: AssistantMessage[]) => {
        conversation.current = next;
        setMessages(next);
      };
      const asked: AssistantMessage[] = [
        ...conversation.current,
        { id: crypto.randomUUID(), role: "user", text: question },
      ];
      const answerId = crypto.randomUUID();
      let answer = "";

      busy.current = true;
      show(asked);
      setError(undefined);
      setStatus("thinking");
      try {
        await engine.reply(asked, (piece) => {
          answer += piece;
          setStatus("responding");
          show([...asked, { id: answerId, role: "assistant", text: answer }]);
        });
        if (!answer) setError("The assistant gave no answer.");
      } catch (cause) {
        // Whatever part of the answer arrived stays on screen.
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : "The assistant could not answer.",
        );
      } finally {
        busy.current = false;
        setStatus("idle");
      }
    },
    [engine],
  );

  return { messages, status, error, send, connected: engine !== undefined };
}
