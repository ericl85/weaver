# Weaver — Project State Memory

_Last updated: 2026-04-19. Update this file whenever a phase completes or an architectural decision is made._

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

### Editor: Lexical as rich text editor with Markdown storage
Lexical was chosen because it is compositional (features are plugins), React-native, and capable of rich text rendering. It is a **rich text editor**, not a Markdown source editor like Obsidian — users see formatted text (bold, italic, headings, lists, etc.) as they type. Files are stored as Markdown on disk via `@lexical/markdown` serialization. There is no separate preview panel because the editor *is* the rendered view. A fixed formatting toolbar above the editor provides text controls. **Implication**: all Lexical node types used by the Markdown transformers (HeadingNode, QuoteNode, ListNode, etc.) must be registered in the editor config.

### Styling: Tailwind utilities only, dark theme only
No CSS-in-JS, no separate stylesheet per component. All color tokens use the `zinc` scale. The design intentionally avoids a light mode to reduce scope.

### Rust code split into per-domain modules (2026-04-19)
`lib.rs` contains only `run()` and command registration; each domain owns its structs and helpers: `util.rs` (slug helpers + `atomic_write`), `project.rs`, `stickies.rs`, `chapters.rs`, `codex.rs`, `raw_files.rs`, `menu.rs`. All `.tmp` writes unified to `.{name}.tmp` hidden-file form via `atomic_write`.

### File I/O: All through Tauri commands
The frontend has no direct filesystem access. Every read/write goes through a Tauri `invoke` call to a Rust command. This keeps the Rust layer as the security/permission boundary.

### On-Disk Format: Opinionated directory + Markdown files + manifest
Chapter filenames are plain slugs (`chapter-title.md`) — **no numeric prefix**. Chapter order is stored in `project.json`'s `chapters: string[]` field, an ordered array of filenames. This makes reordering a first-class operation (update the array, no file renames) and keeps Git history clean. Outline/notes for each chapter are stored as a sidecar `.notes.json` file alongside the `.md`. Codex entries are Markdown files in a `codex/<category>/` subdirectory. Project metadata lives in `project.json` at the root.

### Layout: 3-pane (left nav | editor | right tools)
`App.tsx` uses a 3-pane flex row: fixed-width left navigation pane, `flex-1` editor, fixed-width right tool sidebar. Both sidebars are independently collapsible. (CLAUDE.md says "2-pane" — that's outdated; update it if re-generating.)

### Left pane: content view / file view toggle
The left navigation pane has two modes: **content view** (chapter list + codex list, the normal writing UI) and **file view** (raw project directory browser). File view opens any file in a plain `FileEditor` (`<textarea>`) in the center pane — this is how users edit metadata files (`project.json`, future `metadata.yaml`) without a separate settings screen.

### Right sidebar: Swappable tool panels
The right sidebar hosts Outline, Codex, and AI as swappable panels behind an icon strip. Only one panel is visible at a time. There is no Preview panel — Lexical is a rich text editor, so the editor itself is the rendered view.

### State management: React Context (no Redux/Zustand yet)
The project is too early-stage to warrant a global state library. A `ProjectContext` will hold the active project path, chapter list, and open chapter. A `SettingsContext` holds per-device user preferences (e.g. auto-save toggle), persisted to `localStorage`. Lexical manages its own internal state.

### Editor model: multi-instance stack (one Lexical instance per open chapter)
Selecting a chapter spawns a new `ChapterEditorLayer` (keyed by filename) and stacks it on top. All open layers stay mounted simultaneously — only the active one is visible (`display:none` for others). Undo history survives chapter switches for free. Switching chapters is instant after the first load (no re-read from disk).

**Why**: a single shared editor with load/unload logic creates an inescapable race condition — any async gap between "which chapter is active" and "what content is in the editor" can cause a file overwrite. The multi-instance model makes this architecturally impossible: each instance is permanently bound to one filename and never loads content from any other source.

### Save behaviour: parent-owned, per-chapter debounce + Ctrl+S
`ChapterStackManager` owns all save logic. `Editor.tsx` is a pure editing surface — it only reports content up via `onContentChange(markdown)`. The manager stores `latestContent: Map<filename, markdown>` and `saveTimers: Map<filename, timer>`. Each chapter's debounce timer is independent. Ctrl+S on the wrapper div saves the active chapter immediately. File overwrites are impossible because `latestContent.get(filename)` and `filename` always use the same key.

### Codex editor: full Lexical instance (same as chapters)
Codex entries use the same `RichTextPlugin` + Markdown ↔ Lexical serialization as the chapter editor, not a plain textarea. Writers may want stylized text (bold, italic) in reference notes. The codex editor is a second `LexicalComposer` instance scoped to the sidebar panel — it does not share state with the chapter editor.

---

## Known Issues & Incomplete Areas

| Area | Status | Notes |
|------|--------|-------|
| Editor ↔ file persistence | Complete (T-012) | ChapterStackManager + ChapterEditorLayer; auto-save 1s debounce + Ctrl+S; dirty indicator dot |
| Formatting toolbar + node registration | Complete (T-017) | EditorToolbar.tsx fixed above scroll area; HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, CodeHighlightNode, LinkNode, AutoLinkNode all registered; ListPlugin, LinkPlugin, MarkdownShortcutPlugin added |
| Project open/create flow | Complete (T-008, T-009) | WelcomeScreen with New/Open, ProjectContext wired |
| Left navigation pane | Complete (T-010) | LeftPane with Content/Files toggle; ChapterList (chapters + codex), FileExplorer (dir tree), FileEditor (raw textarea, Ctrl+S) |
| Sidebar panel system | Complete (T-013) | Sidebar.tsx + SidebarIcon.tsx; icon strip always visible, one panel at a time, collapses to strip when none active. Preview panel removed — Lexical is the rendered view. |
| Outline panel | Complete (T-014) | OutlinePanel.tsx in panels/; AnchorNode.tsx in nodes/; EditorContext.tsx exposes LexicalEditor instance; EditorRefPlugin inside Editor.tsx sets it |
| Chapter reordering | Complete (#23) | @dnd-kit/sortable SortableContext + SortableChapterItem in ChapterList; grip handle (⠿) on hover; onDragEnd in DndProvider does optimistic arrayMove + reorderChapters IPC; stickies unaffected. |
| Chapter delete confirmation | Complete (#26) | AlertDialog (shadcn) in ChapterList gated by pendingDelete state; single dialog instance, Cancel/Escape/backdrop all safe, Delete button red destructive. |
| Project Settings Dialog | Complete (#27) | SettingsDialog.tsx shell (Dialog primitive, left-nav + content layout). General section: title/author → update_project_metadata Rust command → updateProjectState. Categories section: list/add/rename/recolor/delete with AlertDialog on delete; COLOR_MAP extracted to src/lib/categoryColors.ts. Entry points: gear icon in TitleBar, File menu item, Ctrl+,/Cmd+,, macOS native menu. Theme/Codex/AI nav rows are disabled placeholders. |
| Daily progress card | Complete (#32) | StatsContext seeds via update_daily_progress once per project open (waits for projectTotal); DailyGoalCard pinned bottom-right of center pane, hidden when no chapter active or no daily goal; amber/blue/emerald progress bars (shadcn Progress); canvas-confetti + CSS pulse on first goal crossing; dismissable via ×; View > Show Progress Card re-shows it (both custom and macOS native menu). |
| Codex UI | Not started | No UI at all |
| Markdown ↔ Lexical serialization | Complete (T-011) | src/lib/markdown.ts; WEAVER_TRANSFORMERS extends TRANSFORMERS with AnchorTransformer; markdownToEditorState / editorStateToMarkdown exported |
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
