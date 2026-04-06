# Weaver — Implementation Plan

_Read `CLAUDE.md` before starting any task. Mark tasks `- [x]` when complete. Update `memory.md` after each phase._

---

## Phase 1 — Project Foundation: Types, IPC, and On-Disk Structure

These tasks establish the data model and file I/O layer everything else builds on. Do these first.

---

- [x] **T-001 — Define shared TypeScript types**
  - **Goal**: Create a single source-of-truth for all domain types used across frontend and IPC boundary.
  - **Files to create**: `src/types/index.ts`
  - **Types to define**:
    - `Project { id, title, author, created: string, rootPath: string }`
    - `Chapter { id, title, filename, order: number, wordCount?: number }`
    - `CodexEntry { id, title, category, filename }`
    - `OutlineItem { id, chapterId, text, anchorOffset: number, anchorLength: number, type: 'note'|'todo'|'feedback' }`
    - `Theme { name, fontFamily, fontSize, lineHeight, backgroundColor, textColor, accentColor }`
  - **Depends on**: nothing
  - **Fits architecture**: These types are passed across the Tauri IPC boundary (frontend calls Rust commands and receives these shapes). Define them once here; Rust structs mirror them.

---

- [x] **T-002 — Add Rust structs mirroring TypeScript types**
  - **Goal**: Define serde-serializable Rust structs for all domain objects, used as Tauri command return types.
  - **Files to modify**: `src-tauri/src/lib.rs` (or split into `src-tauri/src/types.rs` and mod-include it)
  - **Structs**: `Project`, `Chapter`, `CodexEntry`, `OutlineItem`, `Theme` — all `#[derive(Serialize, Deserialize, Debug)]`
  - **Depends on**: T-001 (to stay in sync)
  - **Fits architecture**: Tauri commands serialise these structs to JSON; TypeScript deserialises to the types from T-001.

---

- [ ] **T-003 — Implement Tauri commands: create_project, open_project**
  - **Goal**: Allow the app to create a new project directory structure on disk, or open an existing one.
  - **Files to modify**: `src-tauri/src/lib.rs`, `src-tauri/Cargo.toml`
  - **New Cargo dependency**: `uuid` (for generating project IDs)
  - **Commands**:
    - `create_project(title: String, author: String, path: String) -> Result<Project, String>`
      - Creates `<path>/<title>/` directory tree: `chapters/`, `codex/characters/`, `codex/places/`, `codex/items/`, `themes/`
      - Writes `project.json`
      - Returns `Project`
    - `open_project(path: String) -> Result<Project, String>`
      - Reads and parses `project.json` from path
      - Returns `Project`
  - **Depends on**: T-002
  - **Fits architecture**: All file I/O goes through Tauri commands. Frontend uses `invoke('create_project', {...})`.

---

- [ ] **T-004 — Implement Tauri commands: chapter CRUD**
  - **Goal**: Create, list, read, and save chapter files.
  - **Files to modify**: `src-tauri/src/lib.rs`
  - **Commands**:
    - `list_chapters(project_path: String) -> Result<Vec<Chapter>, String>` — scans `chapters/` for `.md` files, returns sorted by numeric prefix
    - `read_chapter(project_path: String, filename: String) -> Result<String, String>` — returns raw Markdown content
    - `save_chapter(project_path: String, filename: String, content: String) -> Result<(), String>` — writes content atomically (write to `.tmp`, then rename)
    - `create_chapter(project_path: String, title: String) -> Result<Chapter, String>` — picks next order number, creates file, returns Chapter
    - `rename_chapter(project_path: String, filename: String, new_title: String) -> Result<Chapter, String>`
    - `delete_chapter(project_path: String, filename: String) -> Result<(), String>`
  - **Depends on**: T-003
  - **Fits architecture**: Atomic save (write+rename) prevents data loss on crash.

---

- [ ] **T-005 — Implement Tauri commands: codex CRUD**
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

- [ ] **T-006 — Implement Tauri commands: outline/notes CRUD**
  - **Goal**: Read/write the `.notes.json` sidecar files that store outline items anchored to chapter text.
  - **Files to modify**: `src-tauri/src/lib.rs`
  - **Commands**:
    - `read_outline(project_path: String, chapter_filename: String) -> Result<Vec<OutlineItem>, String>`
    - `save_outline(project_path: String, chapter_filename: String, items: Vec<OutlineItem>) -> Result<(), String>`
  - **Depends on**: T-004
  - **Fits architecture**: Sidecar JSON file lives next to the `.md` file with the same base name.

---

- [ ] **T-007 — Create Tauri IPC helper module on the frontend**
  - **Goal**: Wrap all `invoke` calls in typed async functions so components never call `invoke` directly.
  - **Files to create**: `src/lib/tauri.ts`
  - **Exports**: one async function per Tauri command (e.g. `createProject(...)`, `listChapters(...)`, etc.), with full TypeScript types from T-001.
  - **Depends on**: T-001, T-003, T-004, T-005, T-006
  - **Fits architecture**: Centralises the IPC boundary. If a command signature changes, only this file needs updating.

---

## Phase 2 — Project Management UI

Wire up project open/create and chapter navigation. No editor persistence yet.

---

- [ ] **T-008 — Create ProjectContext**
  - **Goal**: React context that holds active project state, chapter list, and selected chapter.
  - **Files to create**: `src/contexts/ProjectContext.tsx`
  - **State**: `project: Project | null`, `chapters: Chapter[]`, `activeChapter: Chapter | null`, `setActiveChapter`, `refreshChapters`
  - **Depends on**: T-001, T-007
  - **Fits architecture**: ProjectContext wraps App; all components that need project state consume it.

---

- [ ] **T-009 — Build Welcome / Project Open screen**
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

- [ ] **T-010 — Build Chapter List sidebar panel**
  - **Goal**: Left or right sidebar showing chapters for the open project, with ability to select, create, and rename.
  - **Files to create**: `src/components/ChapterList.tsx`
  - **Features**: List chapters in order, click to open, "+" button to create new, right-click (or icon) to rename/delete, current chapter highlighted
  - **Depends on**: T-008
  - **Fits architecture**: Uses ProjectContext. Chapter navigation is a sidebar tool, not a top nav bar.

---

## Phase 3 — Editor Persistence

Connect the Lexical editor to file I/O.

---

- [ ] **T-011 — Add Markdown ↔ Lexical serialization**
  - **Goal**: Convert between raw Markdown strings (stored on disk) and Lexical editor state.
  - **Files to create**: `src/lib/markdown.ts`
  - **Approach**: Use `@lexical/markdown` with standard `TRANSFORMERS`. Add `@lexical/markdown` as a dependency in `package.json`.
  - **Exports**: `markdownToEditorState(markdown: string, editor: LexicalEditor): void`, `editorStateToMarkdown(state: EditorState): string`
  - **Depends on**: nothing (pure utility)
  - **Note — Open Question**: `@lexical/markdown` handles CommonMark. Pandoc uses some extensions (footnotes, etc.). For now, CommonMark is sufficient; advanced extensions are a future task.
  - **Fits architecture**: Serialization is isolated in one file. Editor remains Lexical-native.

---

- [ ] **T-012 — Wire editor to active chapter (load + auto-save)**
  - **Goal**: When `activeChapter` changes, load its Markdown into the editor. Auto-save on debounce after edits.
  - **Files to modify**: `src/Editor.tsx`
  - **Behaviour**:
    - On `activeChapter` change: call `readChapter`, convert Markdown → Lexical, update editor state
    - On editor change: debounce 1000ms, convert Lexical → Markdown, call `saveChapter`
    - Show a subtle save indicator (e.g. a dot in the chapter title that clears after save)
  - **Depends on**: T-007, T-008, T-011
  - **Fits architecture**: Keeps persistence logic in the editor component. Auto-save is distraction-free (no modal prompts).

---

## Phase 4 — Sidebar Panel System

Build the infrastructure for swappable right-sidebar panels before implementing individual panels.

---

- [ ] **T-013 — Build sidebar panel shell**
  - **Goal**: Replace the placeholder sidebar div with a panel system: an icon strip on the right edge + a content area that renders the active panel.
  - **Files to create**: `src/components/Sidebar.tsx`, `src/components/SidebarIcon.tsx`
  - **Files to modify**: `src/App.tsx`
  - **Panels**: Outline, Codex, Preview, (AI placeholder). Each icon toggles its panel open/closed. Only one panel visible at a time. Sidebar collapses to icon strip when no panel is active.
  - **Depends on**: T-008 (needs project context for Codex/Outline)
  - **Fits architecture**: Single swappable sidebar area per ARCHITECTURE.md and the sidebar model decision in `memory.md`.

---

## Phase 5 — Outline Panel

---

- [ ] **T-014 — Build Outline panel UI**
  - **Goal**: Show outline items for the active chapter. Allow adding, editing, deleting items.
  - **Files to create**: `src/components/panels/OutlinePanel.tsx`
  - **Features**:
    - List outline items grouped by type (Note, Todo, Feedback)
    - "Add item" creates a new item anchored to the current cursor position
    - Click an item → scroll editor to the anchored text range
    - Item text field is editable inline
  - **Depends on**: T-006, T-007, T-008, T-013
  - **Fits architecture**: Uses sidecar `.notes.json` via T-006 commands.

---

- [ ] **T-015 — Implement outline ↔ editor position sync**
  - **Goal**: As the cursor moves in the editor, highlight the relevant outline item. Clicking an outline item scrolls/moves the editor cursor to the anchored position.
  - **Files to modify**: `src/Editor.tsx`, `src/components/panels/OutlinePanel.tsx`
  - **Approach**: Use a Lexical `registerUpdateListener` to track cursor position (offset). Expose a `scrollToOffset(offset: number)` imperative ref from the editor. OutlinePanel calls this on item click.
  - **Depends on**: T-014
  - **Fits architecture**: Lexical plugin/listener pattern for tracking selection state.

---

## Phase 6 — Codex Panel

---

- [ ] **T-016 — Build Codex panel UI**
  - **Goal**: Browse, create, and edit codex entries within the sidebar.
  - **Files to create**: `src/components/panels/CodexPanel.tsx`
  - **Features**:
    - Category tabs or collapsible groups (Characters, Places, Items, + custom)
    - Entry list, click to open in an inline editor within the panel
    - "New entry" creates a file via T-005 commands
    - Entry content editable (plain textarea or small Lexical instance — keep it simple)
  - **Depends on**: T-005, T-007, T-008, T-013
  - **Fits architecture**: Uses codex CRUD commands from Phase 1.

---

## Phase 7 — Markdown Preview Panel

---

- [ ] **T-017 — Add markdown preview library**
  - **Goal**: Add a Markdown-to-HTML renderer for the preview panel.
  - **Files to modify**: `package.json`
  - **Dependency**: Add `marked` or `remark` + `remark-html`. Prefer `marked` for simplicity; switch to `remark` if we need plugins later.
  - **Depends on**: nothing
  - **Fits architecture**: Rendering happens entirely in the frontend; no Rust needed.

---

- [ ] **T-018 — Build Markdown Preview panel**
  - **Goal**: Show a live rendered HTML preview of the active chapter.
  - **Files to create**: `src/components/panels/PreviewPanel.tsx`
  - **Features**:
    - Renders current editor content as HTML (uses `editorStateToMarkdown` from T-011 → `marked`)
    - Updates on editor change (debounced ~300ms)
    - Styled to match the writing theme (font, colors)
  - **Depends on**: T-011, T-013, T-017
  - **Fits architecture**: Preview is a sidebar panel. Uses the same Markdown serialization layer.

---

## Phase 8 — Theming

---

- [ ] **T-019 — Define Theme data model and defaults**
  - **Goal**: Theme config type is already in T-001. Create default theme values and a ThemeContext.
  - **Files to create**: `src/contexts/ThemeContext.tsx`, `src/lib/themes.ts`
  - **Exports**: `DEFAULT_THEME: Theme`, `applyTheme(theme: Theme): void` (sets CSS custom properties), `ThemeContext`, `ThemeProvider`
  - **Approach**: Theme values are applied as CSS custom properties on `:root`. Tailwind classes reference these vars where needed.
  - **Depends on**: T-001
  - **Fits architecture**: CSS custom properties decouple theming from Tailwind utility regeneration.

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

- [ ] **T-023 — Update window configuration**
  - **Goal**: Set a more appropriate default window size and min-size.
  - **Files to modify**: `src-tauri/tauri.conf.json`
  - **Changes**: `width: 1280, height: 800, minWidth: 900, minHeight: 600`
  - **Depends on**: nothing
  - **Fits architecture**: 800×600 is too small for a 2-pane writing app.

---

- [ ] **T-024 — Add word count to chapter list and status bar**
  - **Goal**: Show word count per chapter in the chapter list and a live word count for the current chapter.
  - **Files to modify**: `src/components/ChapterList.tsx`, `src/Editor.tsx`
  - **Approach**: Count words in the Markdown string on every auto-save tick; store in chapter metadata or compute live.
  - **Depends on**: T-010, T-012
  - **Fits architecture**: Word count is a common distraction-free writing feature that doesn't add UI chrome.

---

## Flagged Conflicts / Open Questions

> Address these before implementing the affected tasks.

| # | Issue | Affects | Decision needed |
|---|-------|---------|-----------------|
| OQ-1 | **Chapter ordering via filename prefix vs. manifest**: Renaming files to reorder is fragile. A `project.json` chapter manifest (ordered array of filenames) is more robust but adds a sync step on every chapter save. | T-004, T-010 | Recommend manifest; confirm before implementing T-004 rename/delete. |
| OQ-2 | **Lexical Markdown fidelity**: `@lexical/markdown` covers CommonMark. The PRD references pandoc-publish which may use Pandoc-specific extensions (footnotes, YAML frontmatter). If we want full pandoc compatibility, we may need custom Lexical transformers or a pre-processing step. | T-011 | Confirm scope of Markdown support before T-011. |
| OQ-3 | **Auto-save vs. manual save**: PRD is silent on this. Auto-save on debounce is recommended (distraction-free), but Ctrl+S should also trigger an immediate save. | T-012 | Low risk — implement both; no decision blocker. |
| OQ-4 | **Codex entry editor**: Should codex entries use a full Lexical editor (with Markdown serialization) or a plain `<textarea>`? Full Lexical is more consistent; textarea is simpler and avoids a second editor instance. | T-016 | Recommend plain textarea for codex; codex entries are reference notes, not prose. |
| OQ-5 | **Outline anchor strategy**: Storing `anchorOffset: number` (character offset) is fragile — editing text before the anchor shifts all offsets. A better strategy is anchoring to a Lexical node key or a unique string pattern in the text. This is complex. | T-014, T-015 | Decide on anchor strategy before T-006 (changes the `OutlineItem` type). Character offset is acceptable for v1 with a known limitation. |
