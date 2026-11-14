# 0002: Data lives on the device, with no account

Status: accepted, 2026-11-14

## Context

Until now the desktop app only worked after signing in, against a Supabase stack running in Docker. That made the app unusable day to day, and sign-in is not a priority yet. The planned stack already called for SQLite and offline-first behaviour.

## Decision

The app opens straight into the workspace with no account. Everything is saved in a SQLite database on the device.

- Screens keep depending on the `AtlasData` interface. `createLocalAtlasData` in `packages/core/src/local/` implements it over a small `SqlDatabase` interface, so the queries are shared and each app only wraps its own SQLite driver (`tauri-plugin-sql` on desktop).
- The on-device schema and its migrations live in `packages/core/src/local/migrations.ts`, versioned with `PRAGMA user_version`.
- One set of tests (`packages/core/test-support/data-contract.ts`) defines what a data layer must do.

## What is parked, not deleted

- The Supabase backend (`packages/db`, `supabase/`) and the sign-in logic in `@atlas/core` stay, tested, as the starting point for sync. The app does not use them.
- Update, 2026-11-14: the server-backed data layer (`createAtlasData`) was removed when deadlines became tasks. Keeping a second, unused implementation in step with every feature cost more than it protected, and sync will reshape the server side anyway. The server schema therefore still has deadlines and no tasks or projects. The last version is in commit `611998f`.
- The desktop sign-in screen was removed from the app. It can be restored from commit `d06defe` when accounts return.

## Consequences

- No Docker is needed to run or use the app. `pnpm db:*` commands are only for working on the parked backend.
- Data exists only on that Mac. There is no backup or sync until accounts return, at which point local rows (which already have UUID ids and timestamps) are uploaded.
- A workspace is a server concept. On the device there is one implicit workspace, `LOCAL_WORKSPACE`.
- The driver's connection pool does not guarantee transactions or foreign-key enforcement across calls, so the data layer checks references itself and orders multi-step deletes so that a failure leaves no orphans.
