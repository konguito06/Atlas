import { useEffect } from "react";
import { usePreference } from "./preferences";

export const APPEARANCES = ["system", "light", "dark"] as const;
export type Appearance = (typeof APPEARANCES)[number];

// index.html reads this key too, to pick the theme before the first paint.
const STORAGE_KEY = "atlas.appearance";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** The theme a choice means right now. */
export function resolveTheme(
  appearance: Appearance,
  systemIsDark: boolean,
): "light" | "dark" {
  if (appearance === "system") return systemIsDark ? "dark" : "light";
  return appearance;
}

/**
 * The Appearance setting. Keeps data-theme on <html> in step with it, and
 * with the Mac's own setting while "system" is chosen.
 */
export function useAppearance(): [Appearance, (next: Appearance) => void] {
  const [appearance, setAppearance] = usePreference(
    STORAGE_KEY,
    APPEARANCES,
    "system",
  );

  useEffect(() => {
    // Not every environment (tests) can answer the query; assume light.
    const system = window.matchMedia?.(DARK_QUERY);
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(
        appearance,
        system?.matches ?? false,
      );
    };
    apply();
    if (appearance !== "system" || !system) return;
    system.addEventListener("change", apply);
    return () => system.removeEventListener("change", apply);
  }, [appearance]);

  return [appearance, setAppearance];
}
