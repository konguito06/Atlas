# ATLAS roadmap

Last updated 2026-11-15. This follows the product structure brief: four sections (Home, Documents, Tasks & Exams, Schedule) with the assistant reached through a sphere on Home, built in the ten steps below. The longer vision (memory, voice, automations, mobile, sync) still stands and is listed at the end.

## Vision in brief

ATLAS is a personal operating system for work and study. Home says what is happening. Documents is where anything is made. Tasks & Exams holds responsibilities. Schedule holds time. The assistant understands all of it and helps through conversation, acting only through typed, permission-checked tools and never without approval.

It should feel like a high-quality Mac app: the official palette (navy, gold, aqua, teal, sand), editorial type, generous space, icon-led navigation, restrained motion. The sphere is the product's signature.

Rules that hold throughout: one coherent feature at a time; no fake features and no fake AI; the app works offline and without an account; data access stays behind `AtlasData`; AI keys stay on a server.

## Where things stand

| Section       | Today                                                                                                                                                                                                                                                                                                                                                                                                      | Missing                                                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home          | Greeting, date and time, the sphere, quick capture (task, document), today's schedule with a day line, progress ring and figures, due-soon list, week strip, project progress, recent documents. Every preview links to its section.                                                                                                                                                                       | Events on the day line, a personal greeting, customising.                                                                                                |
| Assistant     | The sphere and panel; OpenAI through the user's own API key, kept in the keychain and used only by native code. It can read the schedule, tasks, exams and documents and search the workspace; and, after the person allows each one, add a task, event or exam, mark a task done, and change a task's title, date or priority. Suggested questions, a line saying what it is doing, and New conversation. | Checked against the real service (needs a key). Answers word by word, deleting, editing documents, conversation history across launches, memory, voice.  |
| Documents     | A library: all documents, favourites and folders, most recently edited first, with search over titles; documents can be starred and filed. A rich-text editor: headings, marks, links, lists, check lists, quotes, code blocks, dividers, Markdown shortcuts, undo, autosave, word count.                                                                                                                  | A type chooser and type filters (they arrive with the second document type), spreadsheets, presentations, code projects, tables, images, slash commands. |
| Tasks & Exams | Three areas. Tasks: notes, due date and time, priority, status, one level of subtasks, projects. Exams: subject, date, optional time, place and notes, a countdown, and optionally tasks linked to the exam. Deadlines: dated tasks and coming exams in one list.                                                                                                                                          | Links from exams to documents, recurring tasks, reminders, tags.                                                                                         |
| Schedule      | A calendar with day, week and month views showing the weekly timetable, events, exams and task due dates together; events that are timed or all day, added from a button or by clicking an hour; the timetable editor.                                                                                                                                                                                     | Recurring events, drag-and-drop, time blocking from tasks, study sessions linked to an exam, reminders.                                                  |
| Shell         | Four-section sidebar with compact and expanded modes, tooltips, Command-1 to 4 and Command-comma, Settings, light, dark and system themes. Command-K search and commands: finds documents by title and content, tasks, exams and events; goes to sections and areas; adds a task; creates a document.                                                                                                      | Search by meaning (needs the assistant), search inside the document being read, more commands.                                                           |
| Platform      | Desktop only, data on the device.                                                                                                                                                                                                                                                                                                                                                                          | Sync, accounts, mobile.                                                                                                                                  |

## Order of work

1. **Four-section structure.** Done.
2. **Home as the Command Center.** Done for the data that exists, upcoming exams and events included.
3. **The sphere and assistant panel.** Done as an interface with no engine connected.
4. **Tasks & Exams and their relationships.** Done. An exam is a date first; linking tasks to it is optional. Deadlines are a view over dated tasks and exams, not a third kind of item. Still open: linking documents to an exam.
5. **Schedule.** First part done: events and the day, week and month calendar. Still to come: recurring events, dragging to move or resize, turning a task into a time block, linking a session to an exam.
6. **Documents library and editor.** Library done: search by title, favourites, folders. Every document now has a type, with rich text the only one. Still to come: editor extras (slash commands, tables, images) and links from projects to documents.
7. **Global search and command palette.** Done. Search is by words, ignoring case and accents; search by meaning belongs to the assistant.
8. **Real AI.** First part done on the user's own key (decision 0004): reading the workspace and adding tasks and events with approval. Still to come: streaming, history across launches, and more tools. Accounts and a key on a server are only needed if ATLAS is ever for more than its owner.
9. **More document types.** Spreadsheets, then presentations, then code projects, each with its own focused editor and its own versioned format.
10. **Voice and JARVIS features.** Speech in and out, then integrations and automations.

Alongside or after: sync across devices, the iPhone and iPad apps, assistant memory.

## Open questions

- The greeting is not personal: the app does not know the user's name. A name field in Settings is the smallest way to add it.
