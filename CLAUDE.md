# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ATLAS is a cross-platform productivity app for macOS (desktop), iPhone and iPad. Desktop and mobile are both first-class products.

Only the foundation exists so far: two empty app shells and one shared package. There is no backend, editor, sync or AI code yet.

- `apps/desktop` (`@atlas/desktop`): Tauri 2, React, Vite, Tailwind 4, shadcn/ui
- `apps/mobile` (`@atlas/mobile`): Expo SDK 58, Expo Router, NativeWind 4 (Tailwind 3)
- `packages/core` (`@atlas/core`): shared logic and models

## Planned stack

Not installed yet. Add each library with the first feature that uses it.

- **Desktop:** Tiptap
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime), Drizzle ORM
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
- Add shadcn components with `pnpm dlx shadcn@latest add <name>` from `apps/desktop`.

## Architecture rules

- Business logic and data models are shared between the apps. Never duplicate backend business logic.
- UI components are platform-specific. Never build mobile screens in a WebView, and never force desktop components into mobile layouts.
- Documents use one unified JSON schema across both apps. Never store a whole document as unstructured HTML.
- Organize code by feature (modular, feature-based architecture).
- The database is designed for multi-user workspaces, with strict Row Level Security.
- AI API credentials stay on the server. Never expose database administrative credentials to a client.
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
6. Test both desktop and mobile behavior.
7. Verify synchronization and security.

Update the documentation whenever an architectural decision changes.

## Commits

Make one small commit per feature or category of change, so each can be reviewed and reverted on its own. Push to `origin/main` once its checks pass.
