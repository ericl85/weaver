# Weaver

A minimalist desktop app for writing novels. Dark theme, no frills, stays out of your way.

Built with [Tauri 2](https://tauri.app), React, and [Lexical](https://lexical.dev). Stores your work as plain Markdown files in an opinionated directory layout that plays nicely with Git and [pandoc](https://pandoc.org).

---

## Features

- **Rich text editor** — bold, italic, headings, lists, blockquotes, code. What you see is what gets exported; no separate preview pane.
- **Chapter management** — create, rename, reorder (drag-and-drop), and delete chapters. Order is stored in `project.json` so file renames never pollute your Git history.
- **Stickies** — draggable sticky notes attached to each chapter. Organized by color-coded categories you define. Stored as a sidecar `.stickies.json` next to each chapter file, so they travel with your project but stay out of pandoc's way.
- **File browser** — drop into a raw view of your project directory and edit any file (metadata, config, notes) without leaving the app.
- **Codex** (in progress) — a reference library for characters, places, and items, stored as Markdown in `codex/<category>/`.
- **Project settings** — title, author, and codex category management in one dialog.

## Project layout

```
<project-root>/
  project.json                      # title, author, chapter order
  chapters/
    chapter-title.md                # one file per chapter
    chapter-title.stickies.json     # sticky notes for that chapter
  codex/
    characters/character-name.md
    places/place-name.md
    items/item-name.md
```

This structure is designed to be committed directly to a Git repository and exported with pandoc — chapters are plain Markdown, metadata lives in a separate file, and all tooling sidecar files (`.stickies.json`) are clearly namespaced so you can `.gitignore` them if you prefer.

## Running locally

```bash
yarn tauri dev   # full desktop app with hot reload
yarn dev         # frontend only in browser (no filesystem access)
yarn build       # production build
```

Requires [Rust](https://rustup.rs) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | React 19 + TypeScript |
| Editor | Lexical 0.42 |
| Styling | Tailwind CSS 4 |
| Desktop shell | Tauri 2 (Rust) |
| Build | Vite 7 |
