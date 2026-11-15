# ATLAS roadmap

Last updated 2026-11-15. This follows the product structure brief: four sections (Home, Documents, Tasks & Exams, Schedule) with the assistant reached through a sphere on Home, built in the ten steps below. The longer vision (memory, voice, automations, mobile, sync) still stands and is listed at the end.

## Vision in brief

ATLAS is a personal operating system for work and study. Home says what is happening. Documents is where anything is made. Tasks & Exams holds responsibilities. Schedule holds time. The assistant understands all of it and helps through conversation, acting only through typed, permission-checked tools and never without approval.

It should feel like a high-quality Mac app: the official palette (navy, gold, aqua, teal, sand), editorial type, generous space, icon-led navigation, restrained motion. The sphere is the product's signature.

Rules that hold throughout: one coherent feature at a time; no fake features and no fake AI; the app works offline and without an account; data access stays behind `AtlasData`; AI keys stay on a server.

## Where things stand

| Section       | Today                                                                                                                                                                                                                                                             | Missing                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home          | Greeting, date and time, the sphere, quick capture (task, document), today's schedule with a day line, progress ring and figures, due-soon list, week strip, project progress, recent documents. Every preview links to its section.                              | Events on the day line, a personal greeting, customising.                                                                                         |
| Assistant     | The sphere with idle, hover, listening, thinking and responding states; a panel with a conversation, text input, a disabled microphone and a close button; conversation logic behind an `AssistantEngine` interface, tested with a fake engine.                   | Any real engine. The app connects none, so the panel says "Not connected yet". Needs a server for the key, context retrieval, tools, permissions. |
| Documents     | A list and a rich-text editor: headings, marks, links, lists, check lists, quotes, code blocks, dividers, Markdown shortcuts, undo, autosave, word count.                                                                                                         | Library page (search, recents, folders, favourites, type filters), type chooser, spreadsheets, presentations, code projects, tables, images.      |
| Tasks & Exams | Three areas. Tasks: notes, due date and time, priority, status, one level of subtasks, projects. Exams: subject, date, optional time, place and notes, a countdown, and optionally tasks linked to the exam. Deadlines: dated tasks and coming exams in one list. | Links from exams to documents, recurring tasks, reminders, tags.                                                                                  |
| Schedule      | A calendar with day, week and month views showing the weekly timetable, events, exams and task due dates together; events that are timed or all day, added from a button or by clicking an hour; the timetable editor.                                            | Recurring events, drag-and-drop, time blocking from tasks, study sessions linked to an exam, reminders.                                           |
| Shell         | Four-section sidebar with compact and expanded modes, tooltips, Command-1 to 4 and Command-comma, Settings, light, dark and system themes.                                                                                                                        | Command palette, search.                                                                                                                          |
| Platform      | Desktop only, data on the device.                                                                                                                                                                                                                                 | Sync, accounts, mobile.                                                                                                                           |

## Order of work

1. **Four-section structure.** Done.
2. **Home as the Command Center.** Done for the data that exists, upcoming exams and events included.
3. **The sphere and assistant panel.** Done as an interface with no engine connected.
4. **Tasks & Exams and their relationships.** Done. An exam is a date first; linking tasks to it is optional. Deadlines are a view over dated tasks and exams, not a third kind of item. Still open: linking documents to an exam.
5. **Schedule.** First part done: events and the day, week and month calendar. Still to come: recurring events, dragging to move or resize, turning a task into a time block, linking a session to an exam.
6. **Documents library and editor.** Next. Landing page with search, recents, folders, favourites and type filters; a type chooser on New document; links from projects to documents; editor extras (slash commands, tables, images).
7. **Global search and command palette.**
8. **Real AI.** Accounts and a server that holds the key, a provider-neutral engine, context retrieval over `AtlasData`, typed tools with validation, permission levels, confirmation for destructive actions, an audit log.
9. **More document types.** Spreadsheets, then presentations, then code projects, each with its own focused editor and its own versioned format.
10. **Voice and JARVIS features.** Speech in and out, then integrations and automations.

Alongside or after: sync across devices, the iPhone and iPad apps, assistant memory.

## Open questions

- The greeting is not personal: the app does not know the user's name. A name field in Settings is the smallest way to add it.
