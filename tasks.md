# Weaver — Implementation Plan

_Read `CLAUDE.md` before starting any task. Mark tasks `- [x]` when complete. Update `memory.md` after each phase._

---

## Phase 1 — Project Foundation: Types, IPC, and On-Disk Structure

These tasks establish the data model and file I/O layer everything else builds on. Do these first.

---

- [x] **T-001 — Define shared TypeScript types** ⚠️ NEEDS REWORK — `Project` is missing the `chapters` manifest field
  - **Goal**: Create a single source-of-truth for all domain types used across frontend and IPC boundary.
  - **Files to modify**: `src/types/index.ts` (file already exists; update `Project`)
  - **Types to define**:
    - `Project { id, title, author, created: string, rootPath: string, chapters: string[] }` — `chapters` is an **ordered array of chapter filenames** (the manifest). This is the source of truth for chapter order.
    - `Chapter { id, title, filename, order: number, wordCount?: number }` — `order` is the chapter's index in the manifest (0-based), derived at read time; not stored in the filename.
    - `CodexEntry { id, title, category, filename }`
    - `OutlineItem { id, chapterId, text, anchorId: string, type: string }` — `type` is a free-form string (e.g. "Note", "Todo", "Feedback", or anything the user defines). `anchorId` is a UUID matching a `<!-- weaver-anchor:UUID -->` comment in the chapter's Markdown. No character offsets — the anchor travels with the text.
    - `Theme { name, fontFamily, fontSize, lineHeight, backgroundColor, textColor, accentColor }`
  - **Depends on**: nothing
  - **Fits architecture**: These types are passed across the Tauri IPC boundary (frontend calls Rust commands and receives these shapes). Define them once here; Rust structs mirror them.

---

- [x] **T-002 — Add Rust structs mirroring TypeScript types** ⚠️ NEEDS REWORK — `Project` struct is missing `chapters: Vec<String>`
  - **Goal**: Define serde-serializable Rust structs for all domain objects, used as Tauri command return types.
  - **Files to modify**: `src-tauri/src/lib.rs`
  - **Structs**: `Project`, `Chapter`, `CodexEntry`, `OutlineItem`, `Theme` — all `#[derive(Serialize, Deserialize, Debug)]`
  - **`Project` must include**: `pub chapters: Vec<String>` — the ordered manifest of chapter filenames.
  - **`OutlineItem` must use**: `pub anchor_id: String` instead of `anchor_offset`/`anchor_length`; `pub item_type: String` (plain string, not an enum — user-defined types must round-trip without a code change).
  - **Depends on**: T-001 (to stay in sync)
  - **Fits architecture**: Tauri commands serialise these structs to JSON; TypeScript deserialises to the types from T-001.

---

- [x] **T-003 — Implement Tauri commands: create_project, open_project** ⚠️ NEEDS REWORK — `project.json` must include `chapters: []`; open_project must return it
  - **Goal**: Allow the app to create a new project directory structure on disk, or open an existing one.
  - **Files to modify**: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`
  - **Cargo dependencies already added**: `uuid` (v4), `chrono` (with serde feature)
  - **Commands**:
    - `create_project(title: String, author: String, path: String) -> Result<Project, String>`
      - Creates `<path>/<title>/` directory tree: `chapters/`, `codex/characters/`, `codex/places/`, `codex/items/`, `themes/`
      - Writes `project.json` with `chapters: []` (empty manifest — no chapters yet)
      - Returns `Project` (with `chapters: vec![]`)
    - `open_project(path: String) -> Result<Project, String>`
      - Reads and parses `project.json` from path — must deserialize `chapters` array
      - Returns `Project` including the `chapters` manifest
  - **Depends on**: T-002
  - **Fits architecture**: All file I/O goes through Tauri commands. Frontend uses `invoke('create_project', {...})`.

---

- [x] **T-004 — Implement Tauri commands: chapter CRUD** ⚠️ NEEDS REWORK — current implementation encodes order in filename prefix; must be rewritten for manifest-based ordering
  - **Goal**: Create, list, read, and save chapter files. Order is stored in `project.json`'s `chapters` manifest, not in filenames.
  - **Files to modify**: `src-tauri/src/lib.rs`
  - **Key design decisions**:
    - Chapter filenames are `slug.md` (no numeric prefix). Example: `the-dark-forest.md`.
    - `project.json` contains `"chapters": ["intro.md", "the-dark-forest.md", ...]` — this ordered array is the sole source of truth for chapter order.
    - The `order` field on `Chapter` is the 0-based index of the filename in the manifest — derived at read time, never persisted on its own.
    - Any write that changes the manifest (create, delete, rename, reorder) must atomically update `project.json`.
  - **Commands**:
    - `list_chapters(project_path: String) -> Result<Vec<Chapter>, String>`
      - Reads `project.json`, iterates `chapters` array in order
      - For each filename, sets `order` = index, derives title from filename slug (replace `-` with spaces, capitalise first letter)
      - Skips filenames not found on disk (graceful degradation)
    - `read_chapter(project_path: String, filename: String) -> Result<String, String>` — unchanged, reads raw Markdown
    - `save_chapter(project_path: String, filename: String, content: String) -> Result<(), String>` — unchanged, atomic write+rename
    - `create_chapter(project_path: String, title: String) -> Result<Chapter, String>`
      - Slugifies title → `slug.md`; if file already exists, append `-2`, `-3`, etc.
      - Creates empty `.md` file
      - Appends filename to `chapters` array in `project.json`
      - Returns `Chapter` with `order` = new last index
    - `rename_chapter(project_path: String, filename: String, new_title: String) -> Result<Chapter, String>`
      - Renames `.md` file and sidecar `.notes.json` (if present) on disk
      - Updates the entry in `project.json`'s `chapters` array (old filename → new filename)
      - Returns updated `Chapter`
    - `delete_chapter(project_path: String, filename: String) -> Result<(), String>`
      - Deletes `.md` file and sidecar `.notes.json` (if present)
      - Removes filename from `project.json`'s `chapters` array
    - `reorder_chapters(project_path: String, filenames: Vec<String>) -> Result<(), String>` ← **new command**
      - Accepts the full desired chapter order as a list of filenames
      - Validates that the list contains the same set of filenames currently in the manifest (no additions or removals)
      - Writes the new order back to `project.json`'s `chapters` array
  - **Helpers to add**: `read_project_json(path) -> Result<Project, String>`, `write_project_json(path, project) -> Result<(), String>` — used by all commands that touch the manifest
  - **Helpers to remove**: `chapter_from_filename` (numeric prefix parsing), `next_chapter_order` — these are artifacts of the filename-based approach
  - **Depends on**: T-003
  - **Fits architecture**: Atomic save (write+rename) prevents data loss on crash. Manifest in `project.json` makes reordering a first-class operation with no filesystem renames.

---

- [x] **T-005 — Implement Tauri commands: codex CRUD**
  - **Goal**: Create, list, read, and save codex entries.
  - **Files to modify**: `src-tauri/src/lib.rs`
  - **Commands**:
    - `list_codex(project_path: String) -> Result<Vec<CodexEntry>, String>` — walks `codex/` subdirectories
    - `read_codex_entry(project_path: String, category: String, filename: String) -> Result<String, String>`
    - `save_codex_entry(project_path: String, category: String, filename: String, content: String) -> Result<(), String>`
    - `create_codex_entry(project_path: String, category: String, title: String) -> Result<CodexEntry, String>`
    - `delete_codex_entry(project_path: String, category: String, filename: String) -> Result<(), String>`
  - **Depends on**: T-003
  - **Fits architecture**: Same pattern as chapter commands.

---

- [x] **T-006 — Implement Tauri commands: outline/notes CRUD**
  - **Goal**: Read/write the `.notes.json` sidecar files that store outline items anchored to chapter text.
  - **Files to modify**: `src-tauri/src/lib.rs`
  - **Commands**:
    - `read_outline(project_path: String, chapter_filename: String) -> Result<Vec<OutlineItem>, String>`
    - `save_outline(project_path: String, chapter_filename: String, items: Vec<OutlineItem>) -> Result<(), String>`
  - **Depends on**: T-004
  - **Fits architecture**: Sidecar JSON file lives next to the `.md` file with the same base name.

---

- [x] **T-007 — Create Tauri IPC helper module on the frontend**
  - **Goal**: Wrap all `invoke` calls in typed async functions so components never call `invoke` directly.
  - **Files to create**: `src/lib/tauri.ts`
  - **Exports**: one async function per Tauri command (e.g. `createProject(...)`, `listChapters(...)`, etc.), with full TypeScript types from T-001.
  - **Depends on**: T-001, T-003, T-004, T-005, T-006
  - **Fits architecture**: Centralises the IPC boundary. If a command signature changes, only this file needs updating.

---

## Phase 2 — Project Management UI

Wire up project open/create and chapter navigation. No editor persistence yet.

---

- [x] **T-008 — Create ProjectContext**
  - **Goal**: React context that holds active project state, chapter list, and selected chapter.
  - **Files to create**: `src/contexts/ProjectContext.tsx`
  - **State**: `project: Project | null`, `chapters: Chapter[]`, `activeChapter: Chapter | null`, `setActiveChapter`, `refreshChapters`
  - **Depends on**: T-001, T-007
  - **Fits architecture**: ProjectContext wraps App; all components that need project state consume it.

---

- [x] **T-009 — Build Welcome / Project Open screen**
  - **Goal**: When no project is open, show a welcome screen with "New Project" and "Open Project" buttons.
  - **Files to create**: `src/components/WelcomeScreen.tsx`
  - **Files to modify**: `src/App.tsx` (conditionally render WelcomeScreen vs. main layout)
  - **Behaviour**:
    - "New Project" opens a simple form (title, author, pick folder via Tauri dialog)
    - "Open Project" opens a folder picker dialog, calls `open_project`
    - On success, sets project in ProjectContext
  - **New Cargo dependency needed**: Add `tauri-plugin-dialog` to `Cargo.toml` and capabilities for folder picker
  - **Depends on**: T-007, T-008
  - **Fits architecture**: Gated entry point; once project is open, the main editor layout renders.

---

- [x] **T-010 — Build left navigation pane (content view + file view)**
  - **Goal**: A fixed-width left sidebar that serves as the primary navigation pane. Has two modes toggled by an icon or tab strip at the top.
  - **Files to create**: `src/components/LeftPane.tsx`, `src/components/ChapterList.tsx`, `src/components/FileExplorer.tsx`, `src/components/FileEditor.tsx`
  - **Files to modify**: `src/App.tsx` — update from 2-pane to **3-pane** layout: `[left nav] [editor] [right tools]`. Left pane and right sidebar are both fixed-width and independently collapsible; editor takes `flex-1`.
  - **Content view** (default mode):
    - Lists chapters in manifest order; click to open in editor; "+" creates a new chapter; right-click or icon to rename/delete.
    - Below chapters: collapsible codex section listing entries by category.
    - Current chapter highlighted.
  - **File view** (raw mode):
    - Renders the project directory tree (`chapters/`, `codex/`, `themes/`, `project.json`, etc.).
    - Clicking any file opens it in a `FileEditor` — a plain `<textarea>` that replaces the Lexical editor in the center pane for that file.
    - `FileEditor` saves on Ctrl+S via `save_raw_file` Tauri command (see note below).
    - This is how users edit metadata files (`project.json`, a future `metadata.yaml`, etc.) without needing a separate settings screen.
  - **New Tauri commands needed** (add to T-004's scope or implement here): `read_raw_file(project_path, relative_path) -> Result<String, String>`, `save_raw_file(project_path, relative_path, content) -> Result<(), String>`
  - **Depends on**: T-007, T-008
  - **Fits architecture**: Left pane is navigation; right sidebar is tools. File view makes the project structure transparent without breaking the writing UX.

---

## Phase 3 — Editor Persistence

Connect the Lexical editor to file I/O.

---

- [x] **T-011 — Add Markdown ↔ Lexical serialization**
  - **Goal**: Convert between raw Markdown strings (stored on disk) and Lexical editor state.
  - **Files to create**: `src/lib/markdown.ts`
  - **Approach**:
    - Add `@lexical/markdown` as a dependency in `package.json`.
    - Define a `WEAVER_TRANSFORMERS` constant: `export const WEAVER_TRANSFORMERS = [...TRANSFORMERS]` (re-exports the standard CommonMark set from `@lexical/markdown`). **This array is the extension point** — future Pandoc-specific transformers (footnotes, etc.) are added here without touching anything else.
    - All serialization in this file uses `WEAVER_TRANSFORMERS`, never `TRANSFORMERS` directly.
    - Include a custom `AnchorTransformer` in `WEAVER_TRANSFORMERS` that handles `<!-- weaver-anchor:UUID -->` comments: on import, creates an invisible `AnchorNode`; on export, serializes back to the comment. (See T-014 for the `AnchorNode` definition.)
  - **Exports**: `markdownToEditorState(markdown: string, editor: LexicalEditor): void`, `editorStateToMarkdown(state: EditorState): string`, `WEAVER_TRANSFORMERS`
  - **YAML frontmatter**: not handled here. pandoc-publish uses a separate metadata file, not inline frontmatter — that file is edited via the raw `FileEditor` in the file view (T-010). No frontmatter transformer needed.
  - **Depends on**: T-014 (for `AnchorNode` and `AnchorTransformer`) — implement T-014's node definition before finalising T-011, or stub the transformer and fill it in during T-014.
  - **Fits architecture**: All Markdown conversion goes through one file. Adding Pandoc extensions later = add to `WEAVER_TRANSFORMERS`, done.

---

- [x] **T-012 — Multi-instance chapter editor (ChapterStackManager)**
  - **Goal**: Replace the single shared `Editor` with a stack of independent per-chapter editor instances. Each instance is permanently bound to one chapter file. Save logic lives in the parent (`ChapterStackManager`), not inside the editor. A file overwrite caused by stale component state is architecturally impossible.
  - **Files to create**: `src/components/ChapterStackManager.tsx`, `src/components/ChapterEditorLayer.tsx`
  - **Files to modify**: `src/Editor.tsx` (simplify — strip all save/load/chapter logic), `src/App.tsx` (replace `<Editor />` with `<ChapterStackManager />`)

  ### Editor.tsx — simplified to a pure editing surface
  - **Props**: `initialContent: string`, `onContentChange: (markdown: string) => void`
  - An `InitialContentPlugin` (defined in this file) runs `markdownToEditorState(initialContent, editor)` in a `useEffect` with empty deps — fires exactly once at mount, never again.
  - To prevent the initial load from triggering dirty state: use a `mountedRef` boolean in `InitialContentPlugin` that is `false` for the first `onContentChange` call (which comes from the mount load), then `true` for all subsequent ones. Pass `isMounted` up alongside the markdown so `ChapterStackManager` can ignore the first emission.
  - **Alternative**: use `OnChangePlugin`'s `onChange` callback which receives `{ tags }` — skip calls where `tags` contains a load tag. Either approach is fine; implementer's choice.
  - `EditorRefPlugin` stays — still sets the editor in `EditorContext` for `OutlinePanel`.
  - No Ctrl+S handler. No save calls. No project/chapter context imports.

  ### ChapterEditorLayer.tsx — one-to-one wrapper per chapter
  - **Props**: `chapter: Chapter`, `initialContent: string`, `visible: boolean`, `onContentChange: (markdown: string) => void`
  - Renders `<Editor initialContent={initialContent} onContentChange={onContentChange} />`
  - Visibility: wrap in a `<div className={visible ? 'contents' : 'hidden'}>`. `hidden` = `display:none` — the editor stays mounted and keeps all Lexical state (including undo history), it just isn't painted.
  - `chapter.filename` is used as the `key` by `ChapterStackManager` — never changes for this instance.

  ### ChapterStackManager.tsx — owns all open editors and save logic
  - **State**:
    - `openChapters: { chapter: Chapter, initialContent: string }[]` — append-only during a session; items are removed only when explicitly closed
    - `activeFilename: string | null`
    - `loadingFilenames: Set<string>` — prevents double-loading the same chapter
  - **Refs** (not state — must not trigger re-renders):
    - `latestContent: Map<string, string>` — updated on every `onContentChange` from any layer; initialized to `initialContent` when a layer is pushed
    - `saveTimers: Map<string, ReturnType<typeof setTimeout>>` — one debounce timer per open chapter

  - **`openChapter(chapter)`** (called from a `useEffect` watching `ProjectContext.activeChapter`):
    1. If `activeFilename === chapter.filename`: no-op (already active)
    2. If in `openChapters`: set `activeFilename = chapter.filename`, done
    3. If in `loadingFilenames`: no-op (load already in progress)
    4. Otherwise: add to `loadingFilenames`, call `readChapter(project.rootPath, chapter.filename)`, on success:
       - Initialize `latestContent.set(filename, content)`
       - Append `{ chapter, initialContent: content }` to `openChapters`
       - Set `activeFilename = filename`
       - Remove from `loadingFilenames`

  - **`onContentChange(filename, markdown)`** (called by each layer):
    - Update `latestContent.set(filename, markdown)`
    - Mark `filename` as dirty (a `Set<string>` in state for the UI indicator)
    - Reset that chapter's debounce timer: clear existing, set new 1s timer that calls `flush(filename)`

  - **`flush(filename)`**: calls `saveChapter(project.rootPath, filename, latestContent.get(filename))`, on success marks `filename` clean

  - **Ctrl+S**: `onKeyDown` on the outer wrapper `<div>` — when `ctrlKey/metaKey + S`: prevent default, clear `saveTimers.get(activeFilename)`, call `flush(activeFilename)` immediately

  - **Close a chapter**: clear its debounce timer, flush synchronously (fire-and-forget), remove from `openChapters`; if it was active, activate the next/previous open chapter

  - **Renders**: all `ChapterEditorLayer` instances stacked with `position: absolute, inset-0`. Active one has `visible={true}`; others have `visible={false}`. When `openChapters` is empty, render a placeholder ("Open a chapter to start writing").

  - **Dirty indicator**: the dirty `Set<string>` can be used to show a dot on the chapter name in the `ChapterList` (pass via context or callback) — implement the indicator if easy, defer if not.

  ### Why this is safe
  - `latestContent.get(filename)` and `filename` are always the same key — they cannot refer to different chapters.
  - No component ever reads `editor.getEditorState()` directly for saving; content always arrives via the `onContentChange` callback after Lexical has applied it.
  - Switching chapters never modifies an existing editor instance's state. It only changes which one is visible.

  - **Depends on**: T-007, T-008, T-011
  - **Auto-save setting** (T-019): when `SettingsContext` is implemented, read `autoSave` in `ChapterStackManager` and skip scheduling the debounce timer if disabled. Ctrl+S always works regardless.

---

## Phase 4 — Sidebar Panel System

Build the infrastructure for swappable right-sidebar panels before implementing individual panels.

---

- [x] **T-013 — Build sidebar panel shell**
  - **Goal**: Replace the placeholder sidebar div with a panel system: an icon strip on the right edge + a content area that renders the active panel.
  - **Files to create**: `src/components/Sidebar.tsx`, `src/components/SidebarIcon.tsx`
  - **Files to modify**: `src/App.tsx`
  - **Panels**: Outline, Codex, (AI placeholder). Each icon toggles its panel open/closed. Only one panel visible at a time. Sidebar collapses to icon strip when no panel is active. _(Preview panel removed — Lexical is a rich text editor, so the editor itself is the rendered view.)_
  - **Depends on**: T-008 (needs project context for Codex/Outline)
  - **Fits architecture**: Single swappable sidebar area per ARCHITECTURE.md and the sidebar model decision in `memory.md`.

---

## Phase 5 — Outline Panel

---

- [x] **T-014 — Build Outline panel UI + AnchorNode**
  - **Goal**: Show outline items for the active chapter. Allow adding, editing, deleting items. Define the `AnchorNode` Lexical type used by the anchor system.
  - **Files to create**: `src/components/panels/OutlinePanel.tsx`, `src/nodes/AnchorNode.tsx`
  - **AnchorNode** (define first — T-011 depends on it):
    - A custom Lexical inline decorator node that holds a `anchorId: string` (UUID).
    - Renders as a zero-width, invisible `<span data-anchor-id="UUID">` in the editor — users never see it.
    - Serializes to/from `<!-- weaver-anchor:UUID -->` in Markdown via the `AnchorTransformer` registered in `WEAVER_TRANSFORMERS` (T-011).
    - Moves with surrounding text as the user edits — this is the whole point.
  - **OutlinePanel features**:
    - List outline items grouped by type — groups are derived dynamically from the unique `type` strings present in the current chapter's outline items, so user-defined types appear automatically
    - "Add item" at cursor: generates a UUID, inserts an `AnchorNode` at the current editor selection, saves the `OutlineItem` to the sidecar `.notes.json`; type field is a text input that suggests "Note", "Todo", "Feedback" but accepts any free-form string
    - Click an item → find the `AnchorNode` with matching `anchorId` in the editor and scroll/focus to it
    - Item text field editable inline; delete removes the item from `.notes.json` and removes the `AnchorNode` from the document
  - **Depends on**: T-006, T-007, T-008, T-013
  - **Fits architecture**: Anchors live in the Markdown file as HTML comments — invisible in pandoc output, stable across edits, no offset fragility.

---

- [ ] **T-014b — Outline panel UX polish**
  - **Goal**: Fix three usability rough edges in the Outline panel noticed after T-014.
  - **Files to modify**: `src/components/panels/OutlinePanel.tsx`
  - **Issues to fix**:
    1. **Type/category field**: replace the dropdown with a free-text input that autocompletes from type strings already present in the current chapter's outline items. As the user types, show matching suggestions; if no match, the typed value is used as-is. No predefined list — suggestions are derived entirely from existing item types in the chapter.
    2. **New item UX**: when "Add item" is clicked, the new item should be immediately in edit mode — text field focused, ready to type. No extra "edit" button click required.
    3. **Item text field**: audit and fix the overall item editing experience so it feels natural inline. The item row in edit mode should be a clean single input, not a layout-breaking widget.
  - **Depends on**: T-014
  - **Fits architecture**: Panel-only change, no Lexical core or IPC changes needed.

---

- [ ] **T-015 — Implement outline ↔ editor position sync**
  - **Goal**: As the cursor moves in the editor, highlight the outline item whose `AnchorNode` is nearest behind the cursor. Clicking an outline item scrolls the editor to its anchor.
  - **Files to modify**: `src/Editor.tsx`, `src/components/panels/OutlinePanel.tsx`
  - **Approach**:
    - **Cursor → outline**: register a Lexical `registerUpdateListener`. On each update, walk the node tree to find all `AnchorNode` instances and their positions. Determine which anchor is closest before the current selection offset. Emit the active `anchorId` via a shared ref or context so `OutlinePanel` can highlight the corresponding item.
    - **Outline → cursor**: expose a `scrollToAnchor(anchorId: string)` imperative function from the editor (via `useImperativeHandle` or a ref callback). `OutlinePanel` calls this on item click. The function queries the editor state for the `AnchorNode` with the matching key, then calls `node.selectEnd()` and scrolls the DOM node into view.
  - **Depends on**: T-014
  - **Fits architecture**: Standard Lexical listener/query pattern. No character offsets anywhere in this implementation.

---

- [ ] **T-028 — Highlight anchor paragraph on outline item click**
  - **Goal**: When the user clicks an outline item and the editor scrolls to its anchor, visually highlight the paragraph containing that anchor so the user can see exactly what the note refers to. Currently the anchor is invisible (`width:0; font-size:0`) so jumping to it feels disorienting — the cursor lands somewhere but there's no visual cue.
  - **Files to modify**: `src/nodes/AnchorNode.tsx`, `src/components/panels/OutlinePanel.tsx`, `src/Editor.tsx` or a new Lexical plugin
  - **Approach**:
    - When an outline item is clicked, find the `AnchorNode`'s DOM element via `data-anchor-id`, then walk up to its parent block element (the containing `<p>`, `<h1>`, `<li>`, etc.)
    - Apply a temporary highlight class (e.g. a subtle background tint like `bg-zinc-700/40` or a left-border accent) to that block element
    - The highlight should be transient — fade out after ~2 seconds or clear when the user starts typing/clicking elsewhere
    - If the anchor's parent block is the right granularity most of the time (paragraphs are the common case), use that. Don't try to highlight arbitrary ranges of text.
  - **Edge cases**:
    - Anchor at the very start/end of a paragraph — still highlight the whole paragraph
    - Anchor inside a list item — highlight the `<li>`, not the whole list
    - Multiple anchors in the same paragraph — each click highlights the same paragraph, which is fine
  - **Depends on**: T-015 (scroll-to-anchor must work first)
  - **Fits architecture**: DOM-level highlight on the block element, not a Lexical state change — avoids dirtying the editor state or triggering saves. Purely visual feedback.

---

## Phase 6 — Codex Panel

---

- [ ] **T-016 — Build Codex panel UI**
  - **Goal**: Browse, create, and edit codex entries within the sidebar.
  - **Files to create**: `src/components/panels/CodexPanel.tsx`
  - **Features**:
    - Category tabs or collapsible groups (Characters, Places, Items, + custom)
    - Entry list; click an entry to open it in an inline editor within the panel
    - "New entry" creates a file via T-005 commands
    - Entry content editable via a **full Lexical editor instance** (same `RichTextPlugin` + `HistoryPlugin` setup as the chapter editor, with the same Markdown ↔ Lexical serialization from T-011). Writers may want bold/italic/etc. in reference notes.
    - Save on the same pattern as chapters: Ctrl+S + auto-save if enabled
  - **Depends on**: T-005, T-007, T-008, T-011, T-013
  - **Fits architecture**: Reuses the Lexical + Markdown serialization layer. The codex editor is a second Lexical composer instance scoped to the sidebar — it does not share state with the chapter editor.

---

## Phase 7 — Editor Formatting Toolbar

---

- [x] **T-017 — Register Lexical node types and add formatting toolbar**
  - **Goal**: Register the Lexical node types required by the Markdown transformers, add the necessary Lexical plugins, and build a formatting toolbar above the editor.
  - **Why this is critical**: Currently only `AnchorNode` is registered. The `TRANSFORMERS` from `@lexical/markdown` reference `HeadingNode`, `QuoteNode`, `ListNode`, `ListItemNode`, `CodeNode`, `CodeHighlightNode`, and `LinkNode` — none of which are registered. Markdown with headings, lists, or other block-level formatting loads incorrectly without these.
  - **New dependencies** (add to `package.json`): `@lexical/list`, `@lexical/link`, `@lexical/code`
  - **Files to modify**: `src/Editor.tsx`, `package.json`
  - **Files to create**: `src/components/EditorToolbar.tsx`
  - **Node registration** (add to `initialConfig.nodes` in `Editor.tsx`):
    - `HeadingNode` (from `@lexical/rich-text`)
    - `QuoteNode` (from `@lexical/rich-text`)
    - `ListNode`, `ListItemNode` (from `@lexical/list`)
    - `CodeNode`, `CodeHighlightNode` (from `@lexical/code`)
    - `LinkNode`, `AutoLinkNode` (from `@lexical/link`)
  - **Plugins to add** (inside `LexicalComposer`):
    - `ListPlugin` (from `@lexical/react/LexicalListPlugin`) — required for list behavior
    - `LinkPlugin` (from `@lexical/react/LexicalLinkPlugin`) — required for link behavior
    - `MarkdownShortcutPlugin` with `WEAVER_TRANSFORMERS` — lets users type `# `, `- `, `> `, `` ``` ``, `**`, `_` etc. and get live formatting (Obsidian-like shortcuts within the rich text editor)
  - **Theme classes** (extend the `theme` object in `Editor.tsx`):
    - Add classes for `heading.h1`, `heading.h2`, `heading.h3`, `quote`, `list.ul`, `list.ol`, `list.listitem`, `code`, `codeHighlight`, `link`, `text.bold`, `text.italic`, `text.strikethrough`, `text.code`
  - **EditorToolbar component**:
    - Fixed bar above the `ContentEditable`, inside the `LexicalComposer` tree (needs editor context)
    - Buttons: **Bold**, _Italic_, ~~Strikethrough~~, `Code`, H1, H2, H3, Bullet List, Numbered List, Blockquote, Code Block, Link
    - Each button dispatches the appropriate Lexical command (e.g. `FORMAT_TEXT_COMMAND` for bold/italic, `INSERT_ORDERED_LIST_COMMAND` for numbered list, etc.)
    - Active state: buttons reflect current selection formatting (bold button highlighted when cursor is in bold text, etc.) via `$getSelection()` inspection in an update listener
    - Styled as a minimal, dark toolbar consistent with the zinc palette — not floating, not intrusive
    - Keyboard shortcuts: Ctrl+B (bold), Ctrl+I (italic), Ctrl+Shift+S (strikethrough) come free with `RichTextPlugin`; Markdown shortcuts come free with `MarkdownShortcutPlugin`
  - **Depends on**: T-011, T-012
  - **Fits architecture**: Toolbar is a fixed bar, not a floating menu (per ARCHITECTURE.md). Node registration is prerequisite for correct Markdown round-tripping. MarkdownShortcutPlugin gives users Obsidian-like shortcuts without a separate preview.

---

- [ ] **T-018 — Add horizontal rule to toolbar**
  - **Goal**: Add a horizontal rule (thematic break) insert button to the editor toolbar.
  - **Files to modify**: `src/components/EditorToolbar.tsx`, `src/Editor.tsx`
  - **Approach**:
    - Register `HorizontalRuleNode` (from `@lexical/react/LexicalHorizontalRuleNode`) in the editor's `nodes` array.
    - Add `HorizontalRulePlugin` (from `@lexical/react/LexicalHorizontalRulePlugin`) inside the `LexicalComposer`.
    - Add a `INSERT_HORIZONTAL_RULE_COMMAND` dispatch button to the toolbar (an `―` or similar icon).
    - Add a theme class for `hr` in `Editor.tsx` theme object (e.g. `my-6 border-zinc-700`).
    - The `TRANSFORMERS` array already includes `HR` — it will round-trip through Markdown as `---` with no extra work.
  - **Depends on**: T-017
  - **Fits architecture**: Follows the same plugin/node registration pattern established in T-017.

---

## Phase 8 — Theming

---

- [x] **T-019 — Define Theme data model, defaults, and app settings**
  - **Goal**: Theme config type is already in T-001. Create default theme values, a ThemeContext, and a lightweight app settings store for non-theme preferences (starting with auto-save toggle).
  - **Files to create**: `src/contexts/ThemeContext.tsx`, `src/lib/themes.ts`, `src/contexts/SettingsContext.tsx`
  - **ThemeContext exports**: `DEFAULT_THEME: Theme`, `applyTheme(theme: Theme): void` (sets CSS custom properties), `ThemeContext`, `ThemeProvider`
  - **SettingsContext exports**: `SettingsContext`, `SettingsProvider`, `useSettings()` — initial settings shape: `{ autoSave: boolean }`. Persisted to `localStorage` (no project dependency; these are per-device preferences).
  - **Approach**: Theme values are applied as CSS custom properties on `:root`. Tailwind classes reference these vars where needed.
  - **Depends on**: T-001
  - **Fits architecture**: CSS custom properties decouple theming from Tailwind utility regeneration. Settings are intentionally separate from `Project` — they are user preferences, not project data.

---

- [ ] **T-020 — Implement Tauri commands: save_theme, list_themes**
  - **Goal**: Persist themes to the `themes/` directory of the active project.
  - **Files to modify**: `src-tauri/src/lib.rs`
  - **Commands**: `save_theme(project_path: String, theme: Theme) -> Result<(), String>`, `list_themes(project_path: String) -> Result<Vec<Theme>, String>`, `load_theme(project_path: String, name: String) -> Result<Theme, String>`
  - **Depends on**: T-002, T-003
  - **Fits architecture**: Theme files live inside the project directory, making them project-specific and Git-trackable.

---

- [ ] **T-021 — Build Theme Settings panel**
  - **Goal**: UI for editing and saving themes, accessible from the sidebar or a settings area.
  - **Files to create**: `src/components/panels/ThemePanel.tsx`
  - **Features**: Font family picker, font size slider, line height, background colour, text colour. Live preview as you adjust. Save/name a theme. Load saved themes.
  - **Depends on**: T-019, T-020, T-013
  - **Fits architecture**: Another sidebar panel. Could also be triggered from a toolbar.

---

## Phase 9 — AI Sidebar Infrastructure (Placeholder)

_No AI features are built yet. This phase ensures the sidebar and data access patterns are ready for a future AI panel without requiring code changes to the core editor._

---

- [ ] **T-022 — Add AI panel placeholder to sidebar**
  - **Goal**: Add an AI icon to the sidebar icon strip that opens a placeholder panel with a text input and "coming soon" message.
  - **Files to create**: `src/components/panels/AIPanel.tsx`
  - **Files to modify**: `src/components/Sidebar.tsx`
  - **Depends on**: T-013
  - **Fits architecture**: Per PRD — "UI and product design should be designed such that it is an easy and obvious addition". The slot exists; filling it is a future task.

---

## Phase 10 — Polish & Window Configuration

---

- [x] **T-023 — Borderless window configuration**
  - **Goal**: Remove the native OS title bar and set an appropriate default window size, preparing for a custom title bar in T-025.
  - **Files to modify**: `src-tauri/tauri.conf.json`
  - **Changes**:
    - Set `decorations: false` to remove the native title bar and window chrome
    - Set `width: 1280, height: 800, minWidth: 900, minHeight: 600`
  - **Depends on**: nothing
  - **Fits architecture**: A borderless window gives Weaver full control over its appearance. The app will be un-draggable and missing window controls until T-025 is implemented — implement them together.

---

- [x] **T-025 — Custom title bar with window controls and menu bar**
  - **Goal**: Implement a custom `TitleBar.tsx` component that replaces the native title bar with a draggable bar containing app branding, a menu bar, and window controls.
  - **Files to modify**: `src/components/TitleBar.tsx` (new), `src/App.tsx`
  - **Component structure**:
    - Full-width bar at the top of `AppShell`, above the existing flex layout
    - Tauri drag region (`data-tauri-drag-region`) so the window remains draggable
    - **Left**: App name "Weaver" as branding
    - **Center-left**: Menu bar with dropdown menus:
      - **File**: New Project, Open Project, Save (Ctrl+S), Close Project, separator, Exit
      - **Edit**: Undo (Ctrl+Z), Redo (Ctrl+Y), separator, Cut, Copy, Paste, Select All
      - **View**: Toggle Left Pane, Toggle Right Sidebar, separator, Fullscreen
      - **Help**: About Weaver
    - **Right**: Window control buttons (minimize, maximize/restore, close) using `@tauri-apps/api/window`
  - **Behavior**:
    - Menus open on click, close on outside click / blur
    - Only one menu open at a time; hovering another menu label while one is open switches to it
    - Menu items show keyboard shortcut hints (display only — actual shortcuts handled in T-026)
    - Wire up actions that already exist: Save (trigger Ctrl+S), toggle left/right panes, New/Open/Close Project via ProjectContext
    - Edit menu items (Undo, Redo, Cut, Copy, Paste, Select All) use `document.execCommand` for now
    - Window controls call `appWindow.minimize()`, `appWindow.toggleMaximize()`, `appWindow.close()`
  - **Styling**: `bg-zinc-800`, `border-b border-zinc-700`, compact height (~32px). Menu dropdowns use `bg-zinc-800` with `border border-zinc-700`.
  - **Depends on**: T-023
  - **Fits architecture**: Replaces OS chrome with an app-native menu bar. No floating elements over the editor — the title bar is fixed above everything.

---

- [ ] **T-026 — Menu keyboard shortcuts**
  - **Goal**: Add global keyboard shortcut handling for menu actions introduced in T-025.
  - **Files to modify**: `src/components/TitleBar.tsx` or a new `src/hooks/useGlobalShortcuts.ts`
  - **Shortcuts**:
    - `Ctrl+N` — New Project
    - `Ctrl+O` — Open Project
    - `Ctrl+S` — Save (already exists, ensure no conflict)
    - `F11` — Toggle Fullscreen
  - **Approach**: `useEffect` with a global `keydown` listener, registered once at the app root. Avoid conflicts with Lexical's own key handlers (Ctrl+Z/Y, Ctrl+B/I are already handled by the editor).
  - **Depends on**: T-025
  - **Fits architecture**: Keyboard-driven workflows are essential for a writing app. Shortcuts are global but defer to the editor when it has focus.

---

- [ ] **T-027 — Wire theme system to editor and UI rendering**
  - **Goal**: Make the app theme the single source of truth for all visual styling — editor content, UI chrome, and future themeable surfaces. Currently, `applyTheme()` sets CSS variables that nothing reads, and the Lexical theme object is a hardcoded blob of Tailwind classes that never updates.
  - **Files to modify**: `src/lib/themes.ts`, `src/Editor.tsx`, `src/types/index.ts`, `src/contexts/ThemeContext.tsx`, `src/index.css` (or a new theme stylesheet)
  - **Current problems**:
    - CSS variables (`--theme-font-family`, `--theme-text`, etc.) are set on the document root but never referenced by any CSS rule or component
    - The Lexical `theme` object in `Editor.tsx` is static — hardcoded Tailwind classes like `text-zinc-100`, `text-sm`, etc. These ignore the app theme entirely
    - Only `textAlign` works because it's applied as a Tailwind class on the editor wrapper, bypassing the whole system
    - `DEFAULT_THEME` has `fontSize: 72` and `textColor: "#0000ff"` — clearly test values that never rendered
  - **Approach**:
    - **CSS variables as the bridge**: `applyTheme()` already sets variables on `:root`. Add CSS rules (in `index.css` or a theme stylesheet) that reference them. This way the Lexical theme classes, editor content area, and UI chrome all inherit from one place.
    - **Generate the Lexical theme dynamically**: Replace the static `theme` object with a function `buildLexicalTheme(appTheme: Theme)` that produces the Lexical theme using CSS classes that reference the variables (or generates appropriate classes). This keeps Lexical's class-based theming intact while making it responsive to theme changes.
    - **Remount editor on theme change**: Use a `key` prop on `LexicalComposer` derived from theme identity (e.g. `theme.name` or a hash). When the theme changes, the editor remounts with the new Lexical theme object. This is the simplest correct approach — no need to fight Lexical's static config.
    - **Fix the Theme type**: Expand it to cover what users will actually want to theme. Consider: editor font, editor background (distinct from app background), accent color usage, toolbar/sidebar styling. Don't over-specify now, but make sure the type is extensible.
    - **Fix DEFAULT_THEME**: Correct the obviously wrong values (`fontSize: 72`, `textColor: "#0000ff"`).
  - **What NOT to do**:
    - Don't use inline styles on ContentEditable as the primary mechanism — it works for a few properties but doesn't scale to heading sizes, quote styling, code block colors, etc.
    - Don't hardcode Tailwind color classes for anything that should be user-configurable
  - **Depends on**: nothing (can be done independently)
  - **Fits architecture**: The theme system was designed correctly in concept (CSS variables + context) but never connected to rendering. This task closes that gap and makes it ready for a future theme settings UI.

---

- [x] **T-024 — Add word count to chapter list and status bar**
  - **Goal**: Show word count per chapter in the chapter list and a live word count for the current chapter.
  - **Files to modify**: `src/components/ChapterList.tsx`, `src/Editor.tsx`
  - **Approach**: Count words in the Markdown string on every auto-save tick; store in chapter metadata or compute live.
  - **Depends on**: T-010, T-012
  - **Fits architecture**: Word count is a common distraction-free writing feature that doesn't add UI chrome.

---

## Flagged Conflicts / Open Questions

> Address these before implementing the affected tasks.

| #        | Issue                                                 | Affects | Decision needed                                                                                                                                                                                                                                                                           |
| -------- | ----------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~OQ-1~~ | ~~Chapter ordering via filename prefix vs. manifest~~ | —       | **Resolved**: manifest wins. Order stored in `project.json`'s `chapters` array. Filenames are plain slugs with no numeric prefix. See T-001, T-003, T-004.                                                                                                                                |
| ~~OQ-2~~ | ~~Lexical Markdown fidelity~~                         | —       | **Resolved**: CommonMark only for now via `WEAVER_TRANSFORMERS` (extension array in `src/lib/markdown.ts`). Future Pandoc transformers added there. YAML frontmatter not needed — pandoc-publish uses a separate metadata file edited via the file view (T-010, T-011).                   |
| ~~OQ-3~~ | ~~Auto-save vs. manual save~~                         | —       | **Resolved**: implement both. Auto-save on 1s debounce + Ctrl+S for immediate save. Add a user setting to disable auto-save. See T-012, T-019.                                                                                                                                            |
| ~~OQ-4~~ | ~~Codex entry editor~~                                | —       | **Resolved**: full Lexical editor. Writers may want stylized text in codex entries (bold, italic, etc.) even if they're reference notes. Use the same Markdown ↔ Lexical serialization as chapters. See T-016.                                                                            |
| ~~OQ-5~~ | ~~Outline anchor strategy~~                           | —       | **Resolved**: HTML comment anchors in Markdown (`<!-- weaver-anchor:UUID -->`), represented as invisible `AnchorNode` decorator nodes in Lexical. Survives save/load cycles and text edits. `OutlineItem.anchorId: string` replaces offset fields. See T-001, T-002, T-011, T-014, T-015. |
