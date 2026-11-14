# ATLAS roadmap

Last updated 2026-11-14. This turns the product vision into an order of work. The vision text received so far stops partway through the Command Center section, so anything after that (the assistant in detail, architecture, phases) is not reflected here yet.

## Vision in brief

ATLAS is a personal productivity system that understands the information it holds and helps act on it. It is not a Notion clone. It brings together a document workspace, task management, a calendar, flexible databases and search, with an assistant that grows towards a proactive, JARVIS-like helper.

It should feel like a high-quality Mac app, and native on iPhone and iPad: minimal, fast, calm, with careful typography, light and dark themes, smooth motion, strong keyboard support and accessibility. Avoid heavy gradients, overloaded dashboards, and screens built from many cards and borders.

The rule for building it: a strong foundation first, then one feature at a time.

## Where things stand

| Area in the vision   | Today                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command Center       | An overview page exists: clock, greeting, today's schedule, due-soon list, week strip, recent documents. No briefing, projects, quick notes, suggestions or customising. It leans on bordered panels, which the vision asks to avoid.                                                                                                   |
| Documents and editor | Documents can be written in: headings, bold, italic, underline, strikethrough, inline code, links, bullet, numbered and check lists, quotes, code blocks, dividers, Markdown shortcuts, undo and redo, autosave, word count. Not yet: slash commands, tables, images, drag-and-drop blocks, syntax highlighting, nested pages, history. |
| Tasks and projects   | Tasks with notes, an optional due date and time, priority, status (to do, in progress, done), one level of subtasks, and projects with a colour. Not yet: tags, reminders, recurring tasks, dependencies, board or other views, drag-and-drop.                                                                                          |
| Calendar             | A repeating weekly timetable only. No dated events, no day or month view.                                                                                                                                                                                                                                                               |
| Databases            | Nothing.                                                                                                                                                                                                                                                                                                                                |
| Search               | Nothing.                                                                                                                                                                                                                                                                                                                                |
| Assistant            | Nothing. It needs a server to hold the AI key, and the app currently has no account or server.                                                                                                                                                                                                                                          |
| Platforms            | Desktop only. Data is on the device, with no sync. Mobile is an empty shell.                                                                                                                                                                                                                                                            |

## Proposed order

Each phase leaves the app usable and is built desktop-first.

1. **Tasks.** First part done (see the table). Still to come: tags, recurring tasks, reminders, a board view and drag-and-drop.
2. **Calendar.** Day, week and month views that show dated events, the weekly timetable and task due dates together, with time blocking.
3. **Editor.** First part done (see the table). Still to come: slash commands, tables, images, nested pages and history; tables and images need a new document format version.
4. **Search and command palette.** One keyboard-first search across documents, tasks and events.
5. **Command Center.** Rework the overview to the vision: projects, quick notes, statistics, and a calmer layout with fewer boxes.
6. **Accounts and sync.** Bring back sign-in and the parked server so data is backed up and shared across devices. Needed before the assistant and mobile.
7. **Assistant.** Daily briefing, suggestions and natural-language search, through server functions that keep the AI key off devices.
8. **Mobile.** iPhone and iPad apps on the shared logic.
9. **Databases.** Tables, boards and other views with custom properties. The largest single piece, so it comes once the rest is solid.

Design polish (motion, keyboard navigation, empty and loading states, reduced motion) is part of every phase, not a phase of its own.

## Open questions

- The rest of the vision text.
