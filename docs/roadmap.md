# ATLAS roadmap

Last updated 2026-11-15. This follows the product structure brief: four sections (Home, Documents, Tasks & Exams, Schedule) with the assistant reached through a sphere on Home, built in the ten steps below. The longer vision (memory, voice, automations, mobile, sync) still stands and is listed at the end.

## Vision in brief

ATLAS is a personal operating system for work and study. Home says what is happening. Documents is where anything is made. Tasks & Exams holds responsibilities. Schedule holds time. The assistant understands all of it and helps through conversation, acting only through typed, permission-checked tools and never without approval.

It should feel like a high-quality Mac app: the official palette (navy, gold, aqua, teal, sand), editorial type, generous space, icon-led navigation, restrained motion. The sphere is the product's signature.

Rules that hold throughout: one coherent feature at a time; no fake features and no fake AI; the app works offline and without an account; data access stays behind `AtlasData`; AI keys stay on a server.

## Where things stand

| Section       | Today                                                                                                                                                                                                                                           | Missing                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home          | Greeting, date and time, the sphere, quick capture (task, document), today's schedule with a day line, progress ring and figures, due-soon list, week strip, project progress, recent documents. Every preview links to its section.            | Upcoming exams and events (they do not exist yet), a personal greeting, customising.                                                              |
| Assistant     | The sphere with idle, hover, listening, thinking and responding states; a panel with a conversation, text input, a disabled microphone and a close button; conversation logic behind an `AssistantEngine` interface, tested with a fake engine. | Any real engine. The app connects none, so the panel says "Not connected yet". Needs a server for the key, context retrieval, tools, permissions. |
| Documents     | A list and a rich-text editor: headings, marks, links, lists, check lists, quotes, code blocks, dividers, Markdown shortcuts, undo, autosave, word count.                                                                                       | Library page (search, recents, folders, favourites, type filters), type chooser, spreadsheets, presentations, code projects, tables, images.      |
| Tasks & Exams | Tasks with notes, due date and time, priority, status, one level of subtasks, and projects with a colour.                                                                                                                                       | Exams as their own entity, deadlines area, links from exams to documents and tasks, recurring tasks, reminders, tags.                             |
| Schedule      | Repeating weekly timetables on a grid.                                                                                                                                                                                                          | Dated events, day and month views, study sessions, exams and deadlines on the calendar, time blocking, drag-and-drop.                             |
| Shell         | Four-section sidebar with compact and expanded modes, tooltips, Command-1 to 4 and Command-comma, Settings, light, dark and system themes.                                                                                                      | Command palette, search.                                                                                                                          |
| Platform      | Desktop only, data on the device.                                                                                                                                                                                                               | Sync, accounts, mobile.                                                                                                                           |

## Order of work

1. **Four-section structure.** Done.
2. **Home as the Command Center.** Done for the data that exists. Exams and events join it when steps 4 and 5 create them.
3. **The sphere and assistant panel.** Done as an interface with no engine connected.
4. **Tasks & Exams and their relationships.** Next. Needs a migration: an `exams` table (subject, date and time, location, notes, topics with a done flag), `exam_id` on tasks for study tasks, and a link table between exams and documents. The section gets three areas: Tasks, Exams, Deadlines (dated tasks, by date). Home gains upcoming exams with countdowns.
5. **Schedule.** Dated events and study sessions (a session can belong to an exam or a task), day, week and month views that also show the timetable, exams and due dates, then time blocking and drag-and-drop. Needs a migration for events.
6. **Documents library and editor.** Landing page with search, recents, folders, favourites and type filters; a type chooser on New document; links from projects to documents; editor extras (slash commands, tables, images).
7. **Global search and command palette.**
8. **Real AI.** Accounts and a server that holds the key, a provider-neutral engine, context retrieval over `AtlasData`, typed tools with validation, permission levels, confirmation for destructive actions, an audit log.
9. **More document types.** Spreadsheets, then presentations, then code projects, each with its own focused editor and its own versioned format.
10. **Voice and JARVIS features.** Speech in and out, then integrations and automations.

Alongside or after: sync across devices, the iPhone and iPad apps, assistant memory.

## Open questions

- The greeting is not personal: the app does not know the user's name. A name field in Settings is the smallest way to add it.
- Whether "Deadlines" should be a view over dated tasks (proposed above) or a third kind of entity beside tasks and exams.
