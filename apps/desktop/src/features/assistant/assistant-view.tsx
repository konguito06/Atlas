import { Sparkles } from "lucide-react";

/**
 * Where the assistant will live. There is no assistant yet, and this page
 * says so; it must never pretend to answer.
 */
export function AssistantView() {
  return (
    <section className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-8 py-16">
      <Sparkles
        aria-hidden="true"
        strokeWidth={1.5}
        className="size-7 text-signal"
      />
      <h1 className="mt-5 font-heading text-4xl tracking-tight">Assistant</h1>
      <p className="mt-4 text-base leading-relaxed">
        ATLAS does not have an assistant yet.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        When it arrives it will answer questions about your tasks, timetable and
        documents, and change them only with your approval. It needs an account
        first: the assistant runs on a server, so that its key never sits on
        this Mac.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Everything else in ATLAS works without it, and without a connection.
      </p>
    </section>
  );
}
