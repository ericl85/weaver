# Weaver — Project State Memory

_Last updated: 2026-04-06. Update this file whenever a phase completes or an architectural decision is made._

---

## What's Built and Working

### Scaffold (complete)
- Tauri 2 + React 19 + Vite 7 + TypeScript project initialised and boots.
- Yarn workspace, all dependencies installed.
- Tailwind CSS 4 configured via PostCSS.
- `yarn tauri dev` runs the app in dev mode with hot reload.

### TypeScript Types (complete)
- `src/types/index.ts`: All domain types defined — `Project`, `Chapter`, `CodexEntry`, `OutlineItem`, `Theme`. Single source of truth for the IPC boundary.

### UI Shell (partial scaffold)
- `src/App.tsx`: 2-pane flex layout — full-height editor on the left (`flex-1`), fixed-width sidebar placeholder on the right (`w-1/4`).
- `src/Editor.tsx`: Lexical editor with `RichTextPlugin`, `HistoryPlugin`, `AutoFocusPlugin`, `OnChangePlugin`. The `onChange` handler currently logs editor state to console (no persistence).
- `src/index.css`: Tailwind imports, body styled to `zinc-900` background, `zinc-100` text.
- The sidebar is a placeholder `<div>` labelled "Codex & Outline".

### Rust Backend (Phase 1 commands complete)
- `src-tauri/src/lib.rs`: All domain structs defined (`Project`, `Chapter`, `CodexEntry`, `OutlineItem`, `Theme`) with `serde`. Commands implemented and registered:
  - `create_project`, `open_project`
  - `list_chapters`, `read_chapter`, `save_chapter`, `create_chapter`, `rename_chapter`, `delete_chapter`
  - `list_codex`, `read_codex_entry`, `save_codex_entry`, `create_codex_entry`, `delete_codex_entry`
- New Cargo deps: `uuid` (v4), `chrono` (with serde feature).
- Chapter filenames: `NN-slug.md` (zero-padded order prefix). `chapter_from_filename` parses order + title from the name. Title-to-slug via `title_to_slug` helper.
- Atomic saves: write to `.tmp` then `fs::rename` for both chapter and codex saves.
- Rename also moves the sidecar `.notes.json` if it exists.
- Security capabilities: `core:default` + `opener:default` in `capabilities/default.json`.

---

## Architectural Decisions Made

### Editor: Lexical (not CodeMirror / Monaco / plain textarea)
Lexical was chosen because it is compositional (features are plugins), React-native, and capable of rich text semantics that may be needed for future AI annotation features. The tradeoff is that Lexical's serialization format is its own JSON — Markdown must be converted to/from Lexical nodes explicitly. **Implication**: implement a Markdown ↔ Lexical serialization step when persisting chapters.

### Styling: Tailwind utilities only, dark theme only
No CSS-in-JS, no separate stylesheet per component. All color tokens use the `zinc` scale. The design intentionally avoids a light mode to reduce scope.

### File I/O: All through Tauri commands
The frontend has no direct filesystem access. Every read/write goes through a Tauri `invoke` call to a Rust command. This keeps the Rust layer as the security/permission boundary.

### On-Disk Format: Opinionated directory + Markdown files + manifest
Chapter filenames are plain slugs (`chapter-title.md`) — **no numeric prefix**. Chapter order is stored in `project.json`'s `chapters: string[]` field, an ordered array of filenames. This makes reordering a first-class operation (update the array, no file renames) and keeps Git history clean. Outline/notes for each chapter are stored as a sidecar `.notes.json` file alongside the `.md`. Codex entries are Markdown files in a `codex/<category>/` subdirectory. Project metadata lives in `project.json` at the root.

### Layout: 3-pane (left nav | editor | right tools)
`App.tsx` uses a 3-pane flex row: fixed-width left navigation pane, `flex-1` editor, fixed-width right tool sidebar. Both sidebars are independently collapsible. (CLAUDE.md says "2-pane" — that's outdated; update it if re-generating.)

### Left pane: content view / file view toggle
The left navigation pane has two modes: **content view** (chapter list + codex list, the normal writing UI) and **file view** (raw project directory browser). File view opens any file in a plain `FileEditor` (`<textarea>`) in the center pane — this is how users edit metadata files (`project.json`, future `metadata.yaml`) without a separate settings screen.

### Right sidebar: Swappable tool panels
The right sidebar hosts Outline, Codex, Preview, and AI as swappable panels behind an icon strip. Only one panel is visible at a time.

### State management: React Context (no Redux/Zustand yet)
The project is too early-stage to warrant a global state library. A `ProjectContext` will hold the active project path, chapter list, and open chapter. A `SettingsContext` holds per-device user preferences (e.g. auto-save toggle), persisted to `localStorage`. Lexical manages its own internal state.

### Save behaviour: auto-save + Ctrl+S + user toggle
Both auto-save (1s debounce) and manual save (Ctrl+S) are implemented. A `SettingsContext` preference `autoSave: boolean` (default: true) controls whether the debounced save fires. Ctrl+S always saves immediately regardless of the setting.

### Codex editor: full Lexical instance (same as chapters)
Codex entries use the same `RichTextPlugin` + Markdown ↔ Lexical serialization as the chapter editor, not a plain textarea. Writers may want stylized text (bold, italic) in reference notes. The codex editor is a second `LexicalComposer` instance scoped to the sidebar panel — it does not share state with the chapter editor.

---

## Known Issues & Incomplete Areas

| Area | Status | Notes |
|------|--------|-------|
| Editor ↔ file persistence | Not started | `onChange` logs to console; no save/load wiring |
| Project open/create flow | Complete (T-008, T-009) | WelcomeScreen with New/Open, ProjectContext wired |
| Left navigation pane | Complete (T-010) | LeftPane with Content/Files toggle; ChapterList (chapters + codex), FileExplorer (dir tree), FileEditor (raw textarea, Ctrl+S) |
| Sidebar panel system | Not started | Placeholder div only |
| Outline data model | Not started | No schema defined yet |
| Codex UI | Not started | No UI at all |
| Markdown ↔ Lexical serialization | Not started | Required before any file I/O can work |
| Theming UI | Not started | Colors hardcoded in Tailwind classes |
| Tauri commands | Phase 1 complete | Manifest-based ordering; all structs use `#[serde(rename_all = "camelCase")]` so IPC JSON matches TypeScript interfaces |
| Window size | 800×600 | Probably too small; may need updating |

---

### Outline anchors: HTML comment markers in Markdown
`OutlineItem` has `anchorId: string` (UUID). When a user adds an outline item, a `<!-- weaver-anchor:UUID -->` comment is inserted at the cursor position in the Markdown. In Lexical this is an invisible inline `AnchorNode` decorator that travels with the text. The comment round-trips through serialize/deserialize unchanged. pandoc ignores HTML comments in output. No character offsets anywhere.

### Markdown serialization: WEAVER_TRANSFORMERS extension array
All Markdown ↔ Lexical conversion uses a `WEAVER_TRANSFORMERS` constant defined in `src/lib/markdown.ts` — a superset of `@lexical/markdown`'s standard `TRANSFORMERS`. Future Pandoc extensions (footnote transformer, etc.) are added to this array. Currently CommonMark only. YAML frontmatter is not needed — pandoc-publish uses a separate metadata file edited via the file view.

## Open Questions / Decisions Needed

_All OQs resolved. No open decisions blocking implementation._
3. **Chapter ordering**: Zero-padded numeric prefix (`01-`, `02-`) is chosen. How should reordering work — rename files, or use a manifest in `project.json`? A manifest is more robust but adds sync complexity. Flagged as open.
4. **Codex categories**: The PRD mentions codex entries but not a taxonomy. The proposed `codex/<category>/` structure allows user-defined categories. Confirm this is flexible enough.
