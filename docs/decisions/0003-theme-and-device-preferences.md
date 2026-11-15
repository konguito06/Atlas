# 0003: Theme tokens in two layers, and preferences kept on the device

Status: accepted, 2026-11-15

## Context

The product vision fixes an official palette (navy `#083A4F`, gold `#A58D66`, aqua `#C0D5D6`, teal `#407E8C`, sand `#E5E1DD`), asks for Light, Dark and System appearance, and wants users to be able to pick or build palettes later without the app being rewritten. Until now dark mode only followed the Mac, through a media query.

## Decision

Colours are defined in `apps/desktop/src/index.css` in two layers.

1. **Palette.** The five official colours as `--atlas-navy`, `--atlas-gold`, `--atlas-aqua`, `--atlas-teal`, `--atlas-sand`.
2. **Roles.** `--background`, `--foreground`, `--primary`, `--accent`, `--muted-foreground`, `--link`, `--signal` and so on, one set per theme, selected by `data-theme="light"` or `data-theme="dark"` on `<html>`. Components use only roles, through Tailwind names such as `bg-background`.

How the palette maps to roles in the light theme:

| Role                              | Colour                                           |
| --------------------------------- | ------------------------------------------------ |
| Window background                 | Sand                                             |
| Text, headings, icons             | Navy                                             |
| Buttons, tick boxes, progress     | Teal                                             |
| Selected item, text selection     | Aqua                                             |
| "Now" marker, small indicators    | Gold                                             |
| Links and other small teal text   | Teal deepened to `#2C6573` so it passes contrast |
| Secondary text                    | Navy lightened to `#46626E`, 4.5:1 on sand       |
| Raised surfaces (dialogs, fields) | A lighter sand, `#F4F1EE`                        |

The dark theme keeps the same roles over a deepened navy, with aqua as the ink.

The Appearance setting (`system`, `light`, `dark`) lives in `src/lib/appearance.ts`. "System" is resolved to light or dark in JavaScript, so CSS only knows two themes. A small script in `index.html` sets the theme before the first paint.

Appearance and sidebar mode describe the device, not the workspace. They are stored in the webview's local storage (`src/lib/preferences.ts`), not in the workspace database, and will not sync.

## Consequences

- A future palette picker or theme editor sets the palette and role variables on `<html>`; no component changes.
- A new colour need means a new role, not a hex value in a component. The exception is the colours users pick for timetable entries and projects (`entry-colors.ts`), which are translucent washes that work on both themes.
- There is no `prefers-color-scheme` in the CSS any more. Tailwind's `dark:` variant keys off `data-theme`.
- If local storage is unavailable the app still works and starts from System and an expanded sidebar.
- The window itself is not translucent. Sidebar vibrancy would need Tauri's private macOS API and a transparent window; that is left for later.
