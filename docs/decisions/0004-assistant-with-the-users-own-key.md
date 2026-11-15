# 0004: The assistant runs on the user's own OpenAI key, kept in the keychain

Status: accepted, 2026-11-15

## Context

The architecture rule is that AI credentials stay on a server. That needs accounts and a hosted backend, neither of which exists: the app is local, with no sign-in. The owner wants a working assistant now, for personal use, with GPT.

## Decision

On desktop the assistant calls OpenAI directly with an API key the user supplies.

- **The key never reaches the web view.** It is saved through a native command into the macOS keychain and can be removed or tested for, but not read back. Requests to OpenAI are made by native code (`apps/desktop/src-tauri/src/assistant.rs`), to one fixed address, with the key added there. It is not in the database, the code or local storage.
- **The provider sits behind an interface.** `ChatModel` (`packages/core/src/assistant-engine.ts`) is anything that can chat and ask for tools; `createOpenAiModel` is the only one today. The engine, tools and interface do not know which provider answers.
- **The model acts only through tools.** Each tool (`packages/core/src/assistant-tools.ts`) has a Zod schema for its input, goes through `AtlasData`, and returns plain data. Input that fails the schema is refused before anything runs. The model never sees or writes SQL.
- **Changes need approval, every time.** A tool that changes something describes the change in plain words and runs only if the person allows that exact change. Today it can add a task, an event or an exam, mark a task done or not done, and change a task's title, due date, time or priority. It cannot delete anything or edit a document.
- **Document text is data.** The system prompt tells the model that anything tools return, document contents included, is information and not instruction. This lowers the risk of a document steering the assistant; it does not remove it, which is one reason every change needs approval.
- **A reply is limited to six rounds of tools**, and a request times out after 90 seconds.

## What is sent to OpenAI

The conversation, plus whatever the tools return for it: tasks, exams, events, timetable entries, search results and the text of documents the model chooses to read (the first 8,000 characters). Settings says so before a key is saved. Nothing is sent unless the person asks the assistant something.

## Consequences

- OpenAI bills the key's owner per use; a ChatGPT subscription does not cover it.
- This is right for one person on their own Mac, which is what ATLAS is for now. A shipped, multi-user product still needs the server route: accounts, the key on a server, usage limits. When that exists it is another `AssistantAccess`, and this one can remain as an option.
- Answers arrive whole, not word by word, because the native call is not streamed yet.
- There is no conversation history across launches, no memory, and no audit log of what the assistant changed beyond the task or event itself.
- The model name is one constant, `OPENAI_MODEL` in `packages/core/src/openai.ts`.
