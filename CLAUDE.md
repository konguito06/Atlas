# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ATLAS is a cross-platform productivity app for macOS (desktop), iPhone and iPad. Desktop and mobile are both first-class products.

The repo is not scaffolded yet. The stack below is the planned architecture, so check that a package, script or path exists before relying on it.

## Stack

pnpm + Turborepo monorepo. TypeScript is the primary language everywhere.

- **Desktop:** Tauri 2, React, Vite, Tailwind CSS, shadcn/ui, Tiptap
- **Mobile:** React Native, Expo, Expo Router, NativeWind, platform-native components
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime), Drizzle ORM
- **Shared:** Zod, TanStack Query, Zustand, SQLite, Yjs, OpenAI API

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
