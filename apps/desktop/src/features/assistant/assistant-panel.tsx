import {
  ASSISTANT_MESSAGE_MAX_LENGTH,
  type AssistantEngine,
  type AssistantStatus,
  useAssistantConversation,
} from "@atlas/core";
import { ArrowUp, Mic } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AtlasSphere } from "./atlas-sphere";

const STATUS_TEXT: Record<AssistantStatus, string> = {
  idle: "Ask about your tasks, schedule and documents.",
  listening: "Listening…",
  thinking: "Thinking…",
  responding: "Answering…",
};

interface AssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What answers. Left out while ATLAS has no assistant connected. */
  engine?: AssistantEngine;
}

/**
 * The conversation with the assistant. With no engine it says so and takes
 * no messages; it never answers by itself.
 */
export function AssistantPanel({
  open,
  onOpenChange,
  engine,
}: AssistantPanelProps) {
  // Kept here, outside the dialog, so closing it does not end the conversation.
  const { messages, status, error, send, connected } =
    useAssistantConversation(engine);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const busy = status !== "idle";

  // Keep the newest words in view as they arrive.
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "end" });
  }, [messages, error]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    void send(draft);
    setDraft("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(38rem,calc(100svh-4rem))] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-3 border-b border-border px-5 py-4">
          <AtlasSphere status={status} size={40} />
          <div className="grid gap-1">
            <DialogTitle>ATLAS</DialogTitle>
            <DialogDescription role="status" className="text-xs">
              {connected ? STATUS_TEXT[status] : "Not connected yet."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div
          role="log"
          aria-label="Conversation"
          className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
        >
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {connected
                  ? "Nothing asked yet."
                  : "ATLAS does not have an assistant yet. When it does, this is where you will ask about your tasks, schedule and documents, and it will change them only with your approval."}
              </p>
            </div>
          )}
          <ol className="grid gap-4">
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn(
                  "max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap",
                  message.role === "user"
                    ? "justify-self-end rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-accent-foreground"
                    : "justify-self-start",
                )}
              >
                <span className="sr-only">
                  {message.role === "user" ? "You: " : "ATLAS: "}
                </span>
                {message.text}
              </li>
            ))}
          </ol>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
          <div ref={end} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          {/* Voice comes later; the control is in place and switched off. */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            aria-label="Speak to ATLAS (voice is not available yet)"
          >
            <Mic />
          </Button>
          <Input
            aria-label="Message ATLAS"
            value={draft}
            disabled={!connected}
            maxLength={ASSISTANT_MESSAGE_MAX_LENGTH}
            placeholder={connected ? "Ask ATLAS" : "Not connected yet"}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send"
            disabled={!connected || busy || !draft.trim()}
          >
            <ArrowUp />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
