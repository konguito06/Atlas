# ATLAS roadmap

Last updated 2026-11-15. This turns the product vision into an order of work. The full vision text (25 sections) has been received; this file follows its phases.

## Vision in brief

ATLAS is a personal productivity system that understands the information it holds and helps act on it. It is not a Notion clone. It brings together a document workspace, task and project management, a calendar, flexible databases and search, with an assistant that grows towards a proactive, JARVIS-like helper with voice and automations.

It should feel like a high-quality Mac app, and native on iPhone and iPad: minimal, fast, calm, with an official palette (navy, gold, aqua, teal, sand), careful typography, light and dark themes, icon-led navigation, smooth motion, strong keyboard support and accessibility. Avoid heavy gradients, overloaded dashboards, and screens built from many cards and borders.

Rules that hold throughout: one coherent feature at a time; no fake features; the workspace works offline and without an account; data access stays behind `AtlasData`; AI keys stay on a server; the assistant acts only through validated, permission-checked tools.

## Where things stand

| Area                                     | Today                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design system                            | Official palette as two-layer tokens; light, dark and system appearance; themed buttons, fields, dialogs, tick boxes, tooltips and a segmented control. Not yet: a palette picker or theme editor, translucent sidebar material.                                                                                                  |
| Application shell                        | Icon-led sidebar with expanded and compact modes, tooltips, Command-key shortcuts for pages, a Settings page, a short entrance motion per page. Not yet: command palette, top toolbar, contextual menus.                                                                                                                          |
| Command Center                           | The Today page: greeting, date, clock, today's schedule with a day line, progress ring and figures, due-soon list, week strip, recent documents, laid out without boxes. Not yet: projects, quick capture, recent activity across tasks and projects, assistant suggestions, customising.                                         |
| Documents and editor                     | Headings, bold, italic, underline, strikethrough, inline code, links, bullet, numbered and check lists, quotes, code blocks, dividers, Markdown shortcuts, undo and redo, autosave, word count. Not yet: slash commands, callouts, tables, images, attachments, drag-and-drop blocks, syntax highlighting, nested pages, history. |
| Tasks                                    | Notes, optional due date and time, priority, status, one level of subtasks, projects with a colour. Not yet: tags, reminders, recurring tasks, dependencies, board, calendar and timeline views, drag-and-drop.                                                                                                                   |
| Projects                                 | A name and a colour that group tasks. Not yet: overview page, description, progress, milestones, related documents, activity.                                                                                                                                                                                                     |
| Calendar                                 | A repeating weekly timetable only. No dated events, no day or month view.                                                                                                                                                                                                                                                         |
| Search                                   | Nothing.                                                                                                                                                                                                                                                                                                                          |
| Databases                                | Nothing.                                                                                                                                                                                                                                                                                                                          |
| Assistant                                | A sidebar entry and a page that says the assistant does not exist yet. No AI code. `documentToPlainText` exists for it to read documents later.                                                                                                                                                                                   |
| Memory, voice, automations, integrations | Nothing.                                                                                                                                                                                                                                                                                                                          |
| Platforms                                | Desktop only. Data is on the device, with no sync. Mobile is an empty shell. The Supabase backend is parked and behind the app.                                                                                                                                                                                                   |

## Phases

Each phase leaves the app usable and is built desktop-first. Design quality is part of every item, not a phase of its own.

### Phase 0: audit and design foundation (done)

Palette, semantic tokens, themes, typography, shared components and navigation design.

### Phase 1: premium desktop workspace (in progress)

Done: application shell, icon-led navigation, sidebar modes, Today redesign, first part of the editor, first part of tasks.

Suggested order for the rest:

1. **Command palette** (Command-K): go to a page, create a task or document, open a document or project. It is also where search and, later, the assistant are reached.
2. **Calendar**: day, week and month views showing dated events, the weekly timetable and task due dates together; time blocking.
3. **Projects**: an overview page per project with description, progress and its tasks and documents.
4. **Today additions**: quick capture, active projects, recent activity.
5. **Task extras**: tags, recurring tasks, reminders, board view, drag-and-drop.
6. **Editor extras**: slash commands, callouts, tables, images, nested pages, history. Tables and images need a new document format version.

### Phase 2: search and productivity intelligence

Global search across documents, tasks, projects and events, in the command palette; foundations for natural-language search.

### Phase 3: accounts and synchronisation

Bring back sign-in and the parked server for backup and cross-device sync, with explicit conflict resolution. The app stays local-first and usable without an account. Needed before the assistant and mobile.

### Phase 4: ATLAS AI

Provider abstraction, a server that holds the keys, the assistant interface, context retrieval, typed tools with validation, permission levels (read, suggest, act, automate), confirmation for destructive actions, an audit log, daily briefings.

### Phase 5: memory and intelligence

User preferences, inspectable and deletable assistant memory, semantic search, recommendations the user controls.

### Phase 6: mobile

Native iPhone and iPad apps on the shared logic. Never a WebView of the desktop app.

### Phase 7: voice

Speech in and out, push-to-talk, a floating assistant. No always-on listening without explicit consent.

### Phase 8: ATLAS JARVIS

Menu bar assistant, macOS and smart-home integrations, automations, local models.

### Later, once the core workspace is stable

Databases (tables, boards and other views with custom properties) and the automation engine.

## Open questions

- Whether the Assistant entry should stay visible before the assistant exists. It is honest about its state, but it is a page with nothing to do on it.
- The greeting is not personal yet: the app does not know the user's name. A name field in Settings would be the smallest way to add it.
