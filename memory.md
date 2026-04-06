# Weaver — Project State Memory

_Last updated: 2026-04-06. Update this file whenever a phase completes or an architectural decision is made._

---

## What's Built and Working

### Scaffold (complete)
- Tauri 2 + React 19 + Vite 7 + TypeScript project initialised and boots.
- Yarn workspace, all dependencies installed.
- Tailwind CSS 4 configured via PostCSS.
- `yarn tauri dev` runs the app in dev mode with hot reload.

### UI Shell (partial scaffold)
- `src/App.tsx`: 2-pane flex layout — full-height editor on the left (`flex-1`), fixed-width sidebar placeholder on the right (`w-1/4`).
- `src/Editor.tsx`: Lexical editor with `RichTextPlugin`, `HistoryPlugin`, `AutoFocusPlugin`, `OnChangePlugin`. The `onChange` handler currently logs editor state to console (no persistence).
- `src/index.css`: Tailwind imports, body styled to `zinc-900` background, `zinc-100` text.
- The sidebar is a placeholder `<div>` labelled "Codex & Outline".

### Rust Backend (placeholder)
- `src-tauri/src/lib.rs`: Tauri app builder is configured with `tauri-plugin-opener`. One demo command `greet(name) -> String` is registered. No real file I/O commands yet.
- Security capabilities: `core:default` + `opener:default` in `capabilities/default.json`.

---

## Architectural Decisions Made

### Editor: Lexical (not CodeMirror / Monaco / plain textarea)
Lexical was chosen because it is compositional (features are plugins), React-native, and capable of rich text semantics that may be needed for future AI annotation features. The tradeoff is that Lexical's serialization format is its own JSON — Markdown must be converted to/from Lexical nodes explicitly. **Implication**: implement a Markdown ↔ Lexical serialization step when persisting chapters.

### Styling: Tailwind utilities only, dark theme only
No CSS-in-JS, no separate stylesheet per component. All color tokens use the `zinc` scale. The design intentionally avoids a light mode to reduce scope.

### File I/O: All through Tauri commands
The frontend has no direct filesystem access. Every read/write goes through a Tauri `invoke` call to a Rust command. This keeps the Rust layer as the security/permission boundary.

### On-Disk Format: Opinionated directory + Markdown files
Chapters are individual `.md` files prefixed with zero-padded numbers (`01-chapter-title.md`). This makes pandoc export trivial and allows Git line-level diffs per chapter. Outline/notes for each chapter are stored as a sidecar `.notes.json` file alongside the `.md`. Codex entries are Markdown files in a `codex/<category>/` subdirectory. Project metadata lives in `project.json` at the root.

### Sidebar model: Swappable panels, not multiple open sidebars
The PRD lists Outline, Codex, Preview, and AI as sidebar tools. The architectural decision is a single right-sidebar area where panels are selected/toggled via a tab or icon strip. Only one panel is visible at a time. This avoids a fragmented multi-column layout and keeps focus on the editor.

### State management: React Context (no Redux/Zustand yet)
The project is too early-stage to warrant a global state library. A `ProjectContext` will hold the active project path, chapter list, and open chapter. Lexical manages its own internal state.

---

## Known Issues & Incomplete Areas

| Area | Status | Notes |
|------|--------|-------|
| Editor ↔ file persistence | Not started | `onChange` logs to console; no save/load wiring |
| Project open/create flow | Not started | No initial screen, can't open a project |
| Sidebar panel system | Not started | Placeholder div only |
| Outline data model | Not started | No schema defined yet |
| Codex UI | Not started | No UI at all |
| Markdown ↔ Lexical serialization | Not started | Required before any file I/O can work |
| Theming UI | Not started | Colors hardcoded in Tailwind classes |
| Tauri commands | Placeholder only | Only `greet` command exists |
| Window size | 800×600 | Probably too small; may need updating |

---

## Open Questions / Decisions Needed

1. **Lexical Markdown serialization**: Use `@lexical/markdown` with `TRANSFORMERS`? Or write custom? The `@lexical/markdown` package handles basic CommonMark but not all Pandoc-flavoured Markdown. Decide before implementing file save.
2. **Auto-save vs. manual save**: The PRD doesn't specify. Auto-save on debounce (e.g. 1s after last keystroke) is the distraction-free-friendly approach. Manual save (Ctrl+S) should also work. Recommend both.
3. **Chapter ordering**: Zero-padded numeric prefix (`01-`, `02-`) is chosen. How should reordering work — rename files, or use a manifest in `project.json`? A manifest is more robust but adds sync complexity. Flagged as open.
4. **Codex categories**: The PRD mentions codex entries but not a taxonomy. The proposed `codex/<category>/` structure allows user-defined categories. Confirm this is flexible enough.
