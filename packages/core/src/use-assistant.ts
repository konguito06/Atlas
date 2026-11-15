import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  AssistantAccess,
  AssistantEngine,
  AssistantMessage,
  AssistantStatus,
} from "./assistant";
import type { AtlasData } from "./data";

/**
 * One conversation with the assistant. Without an engine nothing can be
 * sent; a message is never answered by anything but the engine.
 */
export function useAssistantConversation(engine: AssistantEngine | undefined) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [status, setStatus] = useState<AssistantStatus>("idle");
  const [error, setError] = useState<string>();
  // What the assistant is doing right now, in words, while it works.
  const [activity, setActivity] = useState<string>();
  // A change the assistant wants to make and is waiting to be allowed.
  const [approval, setApproval] = useState<{
    summary: string;
    answer: (allowed: boolean) => void;
  }>();
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
        await engine.reply(asked, {
          onText: (piece) => {
            answer += piece;
            setStatus("responding");
            show([...asked, { id: answerId, role: "assistant", text: answer }]);
          },
          onActivity: setActivity,
          confirm: (summary) =>
            new Promise<boolean>((resolve) => {
              setApproval({
                summary,
                answer: (allowed) => {
                  setApproval(undefined);
                  resolve(allowed);
                },
              });
            }),
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
        setApproval(undefined);
        setActivity(undefined);
        setStatus("idle");
      }
    },
    [engine],
  );

  /** Starts over with an empty conversation. Ignored while answering. */
  const reset = useCallback(() => {
    if (busy.current) return;
    conversation.current = [];
    setMessages([]);
    setError(undefined);
  }, []);

  return {
    messages,
    status,
    error,
    approval,
    activity,
    send,
    reset,
    connected: engine !== undefined,
  };
}

const keyKey = ["assistant-key"] as const;

/**
 * The assistant's connection: whether a key is saved, the engine to talk to
 * when one is, and saving or removing the key. With no access at all (an
 * app that has no assistant) everything is simply absent.
 */
export function useAssistantAccess(
  access: AssistantAccess | undefined,
  data: AtlasData,
  workspaceId: string,
) {
  const queryClient = useQueryClient();
  const key = useQuery({
    queryKey: keyKey,
    queryFn: () => access?.hasKey() ?? false,
    enabled: access !== undefined,
  });
  const hasKey = key.data === true;
  const engine = useMemo(
    () =>
      access && hasKey ? access.createEngine(data, workspaceId) : undefined,
    [access, hasKey, data, workspaceId],
  );
  const saveKey = useMutation({
    mutationFn: async (value: string) => {
      if (!access) throw new Error("The assistant is not available here.");
      await access.saveKey(value);
    },
    onSuccess: () => queryClient.setQueryData(keyKey, true),
  });
  const removeKey = useMutation({
    mutationFn: async () => {
      await access?.removeKey();
    },
    onSuccess: () => queryClient.setQueryData(keyKey, false),
  });

  return {
    available: access !== undefined,
    hasKey,
    /** The reason the key could not be checked, if it could not. */
    error: key.error,
    engine,
    saveKey,
    removeKey,
  };
}

export type AssistantConnection = ReturnType<typeof useAssistantAccess>;
