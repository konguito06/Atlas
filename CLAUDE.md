# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ATLAS is a cross-platform productivity app for macOS (desktop), iPhone and iPad. Desktop and mobile are both first-class products.

Current focus: build each feature on desktop first. Mobile gets the feature afterwards, so keep logic in shared packages and do not touch `apps/mobile` unless asked.

The app has four sections, always in this order: Home, Documents, Tasks & Exams, Schedule. What exists on desktop: Home (greeting, date, the assistant's sphere, quick capture, today's schedule with a day line, progress ring and figures, due-soon list, week strip, projects, recent documents), Documents (a library with title search, favourites and folders, and a rich-text editor that saves by itself), Tasks & Exams with three areas (tasks with priority, status, due date, subtasks and projects; exams with a date and countdown; deadlines, which is a combined view of dated tasks and coming exams), and Schedule with two areas (a calendar with day, week and month views that shows the weekly timetable, events, exams and task due dates together; and the timetable editor). Command-K opens search and commands: it finds documents (titles and contents), tasks, exams and events, goes to sections, and adds tasks. A Settings page holds appearance (light, dark, system) and sidebar mode. There is no account: the app opens straight in and saves everything in a SQLite database on the Mac. Mobile is still an empty shell. There is no sync. The assistant works once the user saves an OpenAI API key in Settings: it can look up tasks, exams, the schedule and documents, and add tasks and events after asking.

Parked, not used by the app: the Supabase backend (`packages/db`, `supabase/`) and the sign-in logic. The server schema is behind the app (it still has deadlines, not tasks); do not extend it until sync is designed (see `docs/decisions/0002-data-on-the-device.md`).

The product vision and the order of work are in `docs/roadmap.md`. Build one phase at a time and keep its status table current.

Architectural decisions are recorded in `docs/decisions/`. Read the relevant one before changing what it covers, and add a new record when a decision changes.

- `apps/desktop` (`@atlas/desktop`): Tauri 2, React, Vite, Tailwind 4, shadcn/ui
- `apps/mobile` (`@atlas/mobile`): Expo SDK 58, Expo Router, NativeWind 4 (Tailwind 3)
- `packages/core` (`@atlas/core`): shared logic and models
- `packages/db` (`@atlas/db`): Drizzle table definitions and the access-rule tests
- `supabase/`: local Supabase config and SQL migrations

## Planned stack

Not installed yet. Add each library with the first feature that uses it.

- **Desktop:** Tiptap
- **Backend:** Supabase Storage, Realtime and Edge Functions (switched off in `supabase/config.toml` until needed)
- **Shared:** Zod, TanStack Query, Zustand, SQLite, Yjs, OpenAI API

## Commands

Run from the repo root (pnpm + Turborepo).

```sh
pnpm dev:desktop   # Tauri window with hot reload
pnpm dev:mobile    # Metro; press i for the iOS simulator (Expo Go)
pnpm lint          # Biome check
pnpm format        # Biome check --write
pnpm typecheck
pnpm test

# Parked server backend only; the app itself needs none of this.
# Docker Desktop must be running.
pnpm db:start      # local Supabase; Studio at http://127.0.0.1:54323
pnpm db:stop
pnpm db:reset      # rebuild the local database from supabase/migrations
pnpm db:generate --name=<change>            # migration from schema.ts changes
pnpm db:generate --custom --name=<change>   # empty migration for hand-written SQL
pnpm db:types      # regenerate packages/db/src/database.types.ts
pnpm db:test       # tests that need the database; needs db:start, not part of pnpm test

# One test file
pnpm --filter @atlas/desktop exec vitest run src/App.test.tsx
pnpm --filter @atlas/mobile exec jest src/__tests__/home-screen.test.tsx
```

If `cargo` is not found, prefix the command with `PATH="/opt/homebrew/opt/rustup/bin:$PATH"` (Homebrew's rustup is not linked into the default PATH).

## Gotchas

- React, React Native and TypeScript are pinned to the Expo SDK's versions in the `catalog:` of `pnpm-workspace.yaml`. Reference them as `"catalog:"`, never a second version. Expo breaks at runtime with two copies of React.
- Add Expo and React Native packages with `pnpm exec expo install <pkg>` from `apps/mobile` so versions match the SDK.
- Shared packages export TypeScript source (`"exports": "./src/index.ts"`) and have no build step.
- Desktop uses Tailwind 4 (configured in `src/index.css`); mobile uses Tailwind 3 through NativeWind (`tailwind.config.js`). Do not copy config or version-specific syntax between them.
- `react-native-css-interop` is a direct dependency of mobile only because pnpm isolates packages. Keep its version equal to the one `nativewind` depends on.
- Every file under `apps/mobile/src/app` becomes a route. Mobile tests live in `apps/mobile/src/__tests__`.
- pnpm rejects package versions published in the last day and blocks install scripts. Pin the previous version, or decide the script in `allowBuilds`, rather than disabling the check.
- Add shadcn components with `pnpm dlx shadcn@latest add <name> --overwrite` from `apps/desktop` (without `--overwrite` it stops at a prompt), then install any import it left unresolved and run `pnpm format`.
- The desktop app's data is `~/Library/Application Support/com.konguito06.atlas/atlas.db`. Its schema lives in `packages/core/src/local/migrations.ts`: never edit a shipped entry, add a new one.
- Any change to what the data layer does goes in `createLocalAtlasData`, the `AtlasData` interface, the shared tests in `packages/core/test-support/data-contract.ts`, and the desktop fake in `apps/desktop/src/test/fakes.tsx`.
- The on-device driver pools connections, so do not rely on transactions or foreign keys across calls; keep each `execute` self-contained.
- Desktop code is grouped by feature in `apps/desktop/src/features/<feature>`. Screens take the Supabase client as a prop, so tests pass a fake one.
- Shared React hooks live in `@atlas/core`, which lists React and TanStack Query as peer dependencies.
- Task due dates and timetable times have no time zone: dates are `YYYY-MM-DD` strings, clock times are `HH:MM`, timetable times are minutes after midnight. Do not convert them through `Date` in UTC.
- The interface is English, so dates are formatted with `DISPLAY_LOCALE` from `@atlas/core`, never the device locale.
- An exam is a subject and a date; everything else on it is optional. A task may point at an exam (`Task.examId`), and that link is always optional: never require it, and never create tasks for an exam automatically. Deleting an exam keeps its tasks. Deadlines are computed (`deadlines()` in `packages/core/src/exams.ts`), not stored.
- The calendar is computed, not stored: `scheduleDays()` in `packages/core/src/schedule.ts` builds each date from timetables, events, exams and tasks. Anything new that has a date joins the calendar there. Only events are edited from the calendar; timetable entries, exams and tasks are shown and changed where they live. The month view leaves the weekly timetable out on purpose.
- An event has both a start and an end, or neither (all day). In SQL a CHECK that evaluates to NULL passes, so compare nullness explicitly, as the `events` table does.
- Validation rules and their messages live in `@atlas/core` (`validateEvent`, `validateExam`, `validateTask`, `validateProject`, `validateTimetable`, `validateTimetableEntry`); forms call them and show the message. The database checks are a backstop.
- Screens read and write through the `AtlasData` interface from `@atlas/core`, never through a database client directly. Desktop tests use the in-memory fakes in `apps/desktop/src/test/fakes.tsx`.
- In `packages/core`, unit tests sit next to the code in `src/` (`pnpm test`); tests that need the local database live in `tests/` (`pnpm db:test`).

## Document editor

- The editor (Tiptap, set up in `apps/desktop/src/features/documents/editor/extensions.ts`) may only produce what the document format in `packages/core/src/document.ts` allows. Enabling a new block or mark means changing both, plus `docs/decisions/0001-document-format.md`.
- Editor output goes through `fromEditorJson` before saving; stored content goes through `parseDocument` before opening. Never save or open raw JSON.
- `documentToPlainText` is the text that search and the assistant will read. Keep it working for every block type.
- The library logic is in `packages/core/src/library.ts`. Every document has a `type`; only `"text"` exists. A new kind of document (spreadsheet, presentation, code) is added to `DOCUMENT_TYPES` together with its own editor and its own versioned content format, and the type chooser on New document arrives with the second type, not before.
- Starring or filing a document goes through `organizeDocument`, which leaves `updatedAt` alone: organising is not editing. Deleting a folder keeps its documents.
- In tests the simulated browser cannot type into the editor. Reach the editor instance through the element (`surface.editor`) and use its commands, as `document-editor.test.tsx` does.

## Look and feel

- The target is a calm, Apple-inspired Mac app: minimal, few boxes and borders, careful type and spacing, smooth but restrained motion, full keyboard use, reduced-motion respected. Avoid heavy gradients and dashboard clutter. Set parts of a page apart with a heading, a hairline and space, not with cards.
- Colours come in two layers in `apps/desktop/src/index.css`: the official palette (`--atlas-navy`, `--atlas-gold`, `--atlas-aqua`, `--atlas-teal`, `--atlas-sand`) and the roles built from it. Components use only roles (`bg-background`, `text-muted-foreground`, `text-link`), never a hex value or a palette colour. See `docs/decisions/0003-theme-and-device-preferences.md`.
- The theme is `data-theme="light"` or `"dark"` on `<html>`, set from the Appearance setting (`src/lib/appearance.ts`); there is no `.dark` class and no media query. Tailwind's `dark:` variant follows it. Check any visual change in both themes.
- Teal (`primary`) is for what can be pressed, aqua (`accent`) for what is selected, gold (`signal`) for "now" and small indicators only. Teal is too light for small text on sand: use `text-link`. Errors use `destructive`. Hover is `hover:bg-foreground/6`, so it never looks like a selection.
- Titles use `font-heading` (the system serif); everything else is the system sans.
- Tick boxes get the `atlas-check` class; the platform's own box ignores the theme.
- Feature folders keep their older names: Home is `features/today`; Schedule is `features/schedule`, with the timetable editor still in `features/timetable`.
- Navigation goes through one function in `features/workspace/workspace-screen.tsx`, `go(destination)`, with a `Destination` (`features/workspace/destination.ts`): a section plus, optionally, the area or the single item to open. A screen that can be linked into takes `initial…` props for that. Do not add separate navigation state.
- Search logic is `packages/core/src/search.ts`. Anything new that should be findable gets a kind in `buildSearchEntries` and a destination in `features/command/command-palette.tsx`. Matching ignores case and accents.
- The sidebar has an expanded and a compact mode. Every item keeps its `aria-label` in both, and compact items get a `Tooltip`. A new page is added to the lists in `features/workspace/sidebar.tsx`.
- Preferences about the device (appearance, sidebar mode) go through `usePreference` in `src/lib/preferences.ts`, not the workspace database.
- The window has no title bar. Elements with `data-tauri-drag-region` at the top of the sidebar and main area drag the window, so keep interactive content below the first 2rem.

## Assistant

Read `docs/decisions/0004-assistant-with-the-users-own-key.md` before changing any of this.

- The assistant is reached through the sphere on Home (`features/assistant/atlas-sphere.tsx`, styled under `.atlas-sphere` in `index.css`). The sphere is the one place gradients and glow are allowed. Its `status` (idle, listening, thinking, responding) decides how it moves.
- It answers with OpenAI, using the user's own API key. The key lives in the macOS keychain and is read only by native code (`src-tauri/src/assistant.rs`), which also makes the requests. Never pass the key to the web view, log it, or store it anywhere else.
- Layers, all in `packages/core/src`: `assistant.ts` (interfaces), `assistant-tools.ts` (what it can do), `assistant-engine.ts` (the tool loop, provider-neutral through `ChatModel`), `openai.ts` (OpenAI's format). The desktop glue is `apps/desktop/src/lib/assistant-access.ts`.
- A new ability is a new tool: a Zod input schema, a `run` over `AtlasData`, and, if it changes anything, a `summary` in plain words, which makes the engine ask the person first. Never let a tool that changes data run without a `summary`, and never give the model a way around `AtlasData`.
- Never add canned or hardcoded answers. Tests script a fake model (`assistant-engine.test.ts`) or a fake engine (`assistant-panel.test.tsx`); nothing in the test suite calls OpenAI.
- With no key saved the panel says "Not connected yet" and its input is disabled. The microphone button is present and disabled until voice exists.
- After changing `src-tauri`, run `cargo check` there (see the note on `cargo` under Commands).

## Server database (parked)

- After any schema change run `pnpm db:reset` and `pnpm db:types`. Two migrations generated in the same second get the same timestamp: rename the second file and its `tag` in `supabase/migrations/meta/_journal.json`.
- Tables and columns are defined in `packages/db/src/schema.ts`. Policies, grants, functions and triggers are hand-written SQL migrations. Never edit a migration that has been applied; add a new one.
- Access is deny-by-default. A new table or column is unusable by clients until a migration grants the privilege (inserts and updates are granted per column) and a policy allows the row.
- Every change to access rules needs a test in `packages/db/tests/rls.test.ts`, run with `pnpm db:test`.
- Policies check membership through the `private.current_user_*` functions. Querying `workspace_members` directly inside a policy recurses.
- Workspaces are created only through the `create_workspace(name)` function, which also makes the caller the owner.
- Apps reach the database through supabase-js with the publishable key. The secret key and direct Postgres connections (Drizzle queries) are server-only.

## Architecture rules

- Business logic and data models are shared between the apps. Never duplicate backend business logic.
- UI components are platform-specific. Never build mobile screens in a WebView, and never force desktop components into mobile layouts.
- Documents use one unified JSON schema across both apps. Never store a whole document as unstructured HTML.
- Organize code by feature (modular, feature-based architecture).
- The database is designed for multi-user workspaces, with strict Row Level Security.
- AI API credentials stay out of the interface code: on a server, or, for the user's own key on desktop, in the keychain behind native code (decision 0004). Never expose database administrative credentials to a client.
- Design offline-first. Synchronization must use explicit conflict resolution.
- Avoid unnecessary dependencies.
- No fake buttons or non-functional features. Everything that ships is implemented and tested.

## Workflow

Work incrementally: one feature at a time, never every feature at once. For each feature:

1. Understand the requirements.
2. Identify the affected packages.
3. Define the data model.
4. Design the API.
5. Implement it.
6. Test desktop behavior, and mobile behavior once the feature exists there.
7. Verify synchronization and security.

Update the documentation whenever an architectural decision changes.

## Commits

Make one small commit per feature or category of change, so each can be reviewed and reverted on its own. Push to `origin/main` once its checks pass.
