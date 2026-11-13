# 0001: Document format

Status: accepted, 2026-11-13

## Context

Desktop edits documents with Tiptap. Mobile may not use a web view, so it needs a native editor. Both must read and write the same documents, and a document must never be stored as HTML.

Checked on 2026-11-13: Software Mansion's `react-native-enriched-html` (1.2.0) is a native rich-text input for iOS and Android. It uses no web view, requires the New Architecture, and does not run in Expo Go. It supports bold, italic, underline, strikethrough, inline code, links, headings, bullet, numbered and checkbox lists, block quotes and code blocks. It reads and writes HTML.

## Decision

A document is ProseMirror JSON limited to a fixed set of blocks and marks, plus a `version` number. The format is defined and validated in `packages/core/src/document.ts`.

- Blocks: paragraph, heading (levels 1 to 3), block quote, code block, horizontal rule, bullet list, numbered list, task list. Lists can nest.
- Marks: bold, italic, underline, strikethrough, inline code, link (`http`, `https` and `mailto` only).

Desktop uses this JSON directly, because it is what Tiptap produces. Mobile converts between this JSON and the native editor's HTML in shared code; the nesting mirrors HTML to keep that conversion simple.

## Consequences

- A new block or mark means changing the schema and both editors.
- `version` only goes up for a change old apps cannot read. An app refuses to edit a document with a higher version than it knows.
- Attributes the format does not define are dropped when a document is parsed.

## Open risks

- The mobile editor has not been prototyped; the library was assessed from its documentation only. Unverified: React Native 0.88 support, nested lists and horizontal rules in the native input. Prototyping needs a development build.
- Blocks have no stable ids. Comments on a block or links to a block will need them; sync through Yjs does not.
