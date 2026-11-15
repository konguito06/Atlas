import type { AssistantConnection } from "@atlas/core";
import { Monitor, Moon, Sun } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SidebarMode } from "@/features/workspace/sidebar";
import type { Appearance } from "@/lib/appearance";

interface SettingsViewProps {
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
  sidebar: SidebarMode;
  onSidebarChange: (mode: SidebarMode) => void;
  assistant: AssistantConnection;
}

/** How ATLAS looks on this Mac. Every change applies at once. */
export function SettingsView({
  appearance,
  onAppearanceChange,
  sidebar,
  onSidebarChange,
  assistant,
}: SettingsViewProps) {
  return (
    <section className="mx-auto w-full max-w-3xl px-12 pt-14 pb-16">
      <h1 className="font-heading text-4xl tracking-tight">Settings</h1>

      <div className="mt-10 divide-y divide-border border-y border-border">
        <Setting
          title="Appearance"
          text="System follows the light or dark setting of this Mac."
        >
          <SegmentedControl
            label="Appearance"
            value={appearance}
            onChange={onAppearanceChange}
            options={[
              { value: "system", label: "System", icon: Monitor },
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
            ]}
          />
        </Setting>

        <Setting
          title="Sidebar"
          text="Compact shows icons only and leaves more room for the page."
        >
          <SegmentedControl
            label="Sidebar"
            value={sidebar}
            onChange={onSidebarChange}
            options={[
              { value: "expanded", label: "Expanded" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </Setting>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        These settings are kept on this Mac.
      </p>

      {assistant.available && <AssistantSettings assistant={assistant} />}
    </section>
  );
}

function Setting({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 py-5">
      <div className="min-w-0">
        <h2 className="text-sm font-medium">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
      {children}
    </div>
  );
}

/** Connecting the assistant: saving or removing the OpenAI key. */
function AssistantSettings({ assistant }: { assistant: AssistantConnection }) {
  const [key, setKey] = useState("");
  const error =
    assistant.saveKey.error ?? assistant.removeKey.error ?? assistant.error;

  function handleSave(event: FormEvent) {
    event.preventDefault();
    assistant.saveKey.mutate(key, { onSuccess: () => setKey("") });
  }

  return (
    <section aria-label="Assistant" className="mt-12">
      <h2 className="font-heading text-xl">Assistant</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        The assistant uses OpenAI with your own API key, from
        platform.openai.com. OpenAI charges for its use separately from any
        ChatGPT plan. What you ask, and the tasks, schedule and document text
        needed to answer it, are sent to OpenAI.
      </p>

      <div className="mt-5 border-y border-border py-5">
        {assistant.hasKey ? (
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <div>
              <p className="text-sm font-medium">A key is saved</p>
              <p className="mt-1 text-sm text-muted-foreground">
                It is kept in this Mac's keychain and cannot be shown again.
              </p>
            </div>
            <Button
              variant="outline"
              disabled={assistant.removeKey.isPending}
              onClick={() => assistant.removeKey.mutate()}
            >
              Remove key
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="grid gap-2">
            <label htmlFor="openai-key" className="text-sm font-medium">
              OpenAI API key
            </label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type="password"
                value={key}
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-…"
                onChange={(event) => setKey(event.target.value)}
              />
              <Button
                type="submit"
                disabled={!key.trim() || assistant.saveKey.isPending}
              >
                Save key
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              It is kept in this Mac's keychain, not in ATLAS's own files.
            </p>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error.message}
          </p>
        )}
      </div>
    </section>
  );
}
