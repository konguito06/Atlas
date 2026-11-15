import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { SidebarMode } from "@/features/workspace/sidebar";
import type { Appearance } from "@/lib/appearance";

interface SettingsViewProps {
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
  sidebar: SidebarMode;
  onSidebarChange: (mode: SidebarMode) => void;
}

/** How ATLAS looks on this Mac. Every change applies at once. */
export function SettingsView({
  appearance,
  onAppearanceChange,
  sidebar,
  onSidebarChange,
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
