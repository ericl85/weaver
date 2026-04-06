# Weaver — Agent Working Guide

## What This App Is

Weaver is a minimalist, offline-first novel writing platform. It is a **Tauri 2 desktop app** (Rust backend, React + TypeScript frontend) that gives writers a distraction-free environment for drafting novels in Markdown. The app stores projects as opinionated directory structures on disk, compatible with pandoc for export.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI framework | React 19 + TypeScript (strict) |
| Editor | Lexical 0.42 (@lexical/react) |
| Styling | Tailwind CSS 4 (utility classes only) |
| Build tool | Vite 7 |
| Desktop shell | Tauri 2 (Rust) |
| Package manager | Yarn |
| IPC | Tauri commands (`invoke`) |
| Target platform | Windows (built via GitHub Actions from WSL2) |

## How to Use tasks.md

1. Open `tasks.md` and find the **first unchecked task** (`- [ ]`) in the current phase.
2. Read the task's **Goal**, **Files**, and **Depends on** fields carefully.
3. Verify all listed dependencies are checked before starting.
4. Read every file listed under "Files to read first" at the top of this doc, plus any files the task specifies.
5. Implement the task. Keep changes minimal and scoped to what the task asks.
6. Mark the task done: change `- [ ]` to `- [x]`.
7. Update `memory.md` if the task introduces a new architectural decision or changes project state.

## Files to Always Read Before Starting Work

- `CLAUDE.md` (this file) — conventions and working instructions
- `tasks.md` — current implementation plan and progress
- `memory.md` — architectural decisions already made
- `PRD.md` — product requirements
- `ARCHITECTURE.md` — tech stack and UI/UX principles
- `src/App.tsx` — top-level layout (understand pane structure first)
- `src-tauri/src/lib.rs` — all registered Tauri commands live here

## Key Conventions & Patterns

### Frontend

- **Component files**: PascalCase (`Editor.tsx`, `Sidebar.tsx`)
- **Utility/hook files**: camelCase (`useProject.ts`, `fileSystem.ts`)
- **Styling**: Tailwind utility classes only. Color palette: `zinc-900` (bg), `zinc-800` (panels), `zinc-700` (borders), `zinc-100` (text). No custom CSS unless Tailwind cannot express it.
- **Dark theme only** — all components assume dark background.
- **Layout model**: 2-pane flex row. Editor takes `flex-1`. Sidebars are fixed-width and collapsible. All tools (Outline, Codex, Preview, AI) live in the right sidebar area as swappable panels — never floating over the editor.
- **Lexical editor**: Use plugin composition. Add functionality as Lexical plugins, not by modifying `Editor.tsx` core directly. The `LexicalComposer` namespace/theme is the extension point.
- **Tauri IPC**: Call Rust commands via `@tauri-apps/api/core` `invoke`. Always define TypeScript types for command arguments and return values in `src/types/`.
- **No floating menus** over editor text — this is a hard UX rule from `ARCHITECTURE.md`.

### Rust / Tauri

- All Tauri commands are defined in `src-tauri/src/lib.rs` and registered in `.invoke_handler(tauri::generate_handler![...])`.
- Use `serde::{Serialize, Deserialize}` for all command input/output structs.
- File I/O goes through Tauri commands — the frontend never accesses the filesystem directly.
- Add new Cargo dependencies to `src-tauri/Cargo.toml` only when needed; prefer std where possible.

### On-Disk Project Structure

Weaver projects are directories. The layout must be pandoc-compatible (see `mattgemmell/pandoc-publish` pattern). Agreed structure (see `memory.md` for rationale):

```
<project-root>/
  project.json              # title, author, id, created, etc.
  chapters/
    01-chapter-title.md     # zero-padded chapter number prefix
    01-chapter-title.notes.json   # outline/notes anchored to this chapter
    02-...
  codex/
    characters/
      character-name.md
    places/
      place-name.md
    items/
      item-name.md
  themes/
    default.json            # saved theme config
```

Filenames within `chapters/` and `codex/` use lowercase kebab-case with number prefix for chapters.

### State Management

No global state library yet — use React `useState`/`useContext` until complexity demands more. Keep project-level state (current project, open chapter) in a `ProjectContext`. Editor state stays inside Lexical.

## Running the App

```bash
yarn tauri dev      # full Tauri dev mode (hot reload)
yarn dev            # frontend only (browser, no Tauri APIs)
yarn build          # production build
```
