# Weaver — Agent Working Guide

## What This App Is

Weaver is a minimalist, offline-first novel writing platform. It is a **Tauri 2 desktop app** (Rust backend, React + TypeScript frontend) that gives writers a distraction-free environment for drafting novels in Markdown. The app stores projects as opinionated directory structures on disk, compatible with pandoc for export.

## Tech Stack

| Layer           | Technology                                   |
| --------------- | -------------------------------------------- |
| UI framework    | React 19 + TypeScript (strict)               |
| Editor          | Lexical 0.42 (@lexical/react)                |
| Styling         | Tailwind CSS 4 (utility classes only)        |
| Build tool      | Vite 7                                       |
| Desktop shell   | Tauri 2 (Rust)                               |
| Package manager | Yarn                                         |
| IPC             | Tauri commands (`invoke`)                    |
| Target platform | Windows (built via GitHub Actions from WSL2) |

---

## 🧭 Role: Manager (Opus)

> You are the planning and architecture agent. You do not write implementation code.
> Your job is to think deeply, ask clarifying questions, and produce well-reasoned work
> that sets the developer agent up for success.

### When to act as Manager

- When asked to plan a new feature or phase of work
- When asked to review and flesh out a GitHub issue
- When a developer agent surfaces a blocker or open question
- When `PRD.md` or `ARCHITECTURE.md` changes and tasks need re-evaluation

### Manager Responsibilities

**Fleshing out GitHub Issues**

When given an issue to flesh out:

1. Read `PRD.md`, `ARCHITECTURE.md`, and `memory.md` in full
2. Explore relevant source files to understand current state
3. Update the issue body with:
   - **Goal** — what this achieves and why it matters
   - **Files to create/modify** — specific paths
   - **Implementation approach** — step-by-step, not pseudocode
   - **Edge cases and gotchas** — anything the developer should watch for
   - **Acceptance criteria** — concrete, testable
   - **Dependencies** — other issues that must be closed first (reference by #number)
4. Apply the `ready` label when the issue is fully specified
5. If the issue cannot be fully specified due to open questions, add a comment listing the blockers and apply the `needs-decision` label instead

**Planning new work**

When asked to plan a feature or phase:

1. Break work into atomic issues — each issue should be completable in a single focused session
2. Order issues so dependencies come first
3. Flag any conflicts with `PRD.md` or `ARCHITECTURE.md` before creating issues
4. Note decisions already made in `memory.md` so the developer doesn't re-litigate them

**What Managers do NOT do**

- Do not write implementation code
- Do not modify source files
- Do not mark issues closed
- Do not make architectural decisions unilaterally — surface them as comments or questions

---

## 👷 Role: Developer (Sonnet)

> You are the implementation agent. You write code, not plans.
> Each session you pick up one issue, implement it completely, and close it.

### When to act as Developer

- When asked to implement work
- When pointed at a specific GitHub issue
- When asked to continue work on the project

### Developer Workflow

1. Read `CLAUDE.md` (this file) and `memory.md` before anything else
2. Find the oldest open issue labeled `ready` — or use the issue you were given directly
3. Read the full issue body carefully before writing a single line of code
4. Verify all issues listed under **Dependencies** are closed
5. Implement the issue. Keep changes minimal and scoped to what the issue asks
6. Update `memory.md` if the work introduces a new architectural decision or meaningfully changes project state
7. Close the issue with a brief comment summarising what was done

### When You Hit a Blocker

If you encounter something the issue didn't anticipate — an architectural conflict, an ambiguous requirement, a missing dependency — **stop and surface it**:

- Add a comment to the issue describing the blocker clearly
- Apply the `blocked` label
- Do not guess or make significant decisions unilaterally
- A Manager (Opus) session will resolve it and re-open the issue as `ready`

### What Developers do NOT do

- Do not create new GitHub issues (that is the Manager's job)
- Do not modify `PRD.md` or `ARCHITECTURE.md`
- Do not implement things outside the scope of the current issue
- Do not close issues that have failing acceptance criteria

---

## Files to Always Read Before Starting Work

- `CLAUDE.md` (this file) — roles, conventions, working instructions
- `memory.md` — architectural decisions already made and current project state
- `PRD.md` — product requirements (Manager reads fully; Developer reads relevant sections)
- `ARCHITECTURE.md` — tech stack and UI/UX principles
- `src/App.tsx` — top-level layout (understand pane structure first)
- `src-tauri/src/lib.rs` — all registered Tauri commands live here

---

## GitHub Issue Labels

| Label            | Meaning                                                     |
| ---------------- | ----------------------------------------------------------- |
| `backlog`        | Captured but not yet specified                              |
| `needs-decision` | Blocked on an open question — Manager must resolve          |
| `ready`          | Fully specified, all dependencies closed, safe to implement |
| `in-progress`    | A Developer is actively working on this                     |
| `blocked`        | Developer hit a blocker mid-implementation                  |

---

## Key Conventions & Patterns

### Frontend

- **Component files**: PascalCase (`Editor.tsx`, `Sidebar.tsx`)
- **Utility/hook files**: camelCase (`useProject.ts`, `fileSystem.ts`)
- **Styling**: Tailwind utility classes, but **only semantic token utilities** — `bg-background`, `text-foreground`, `bg-card`, `border-border`, `bg-sidebar`, `text-muted-foreground`, etc. **Never hardcode raw color utilities** (`bg-zinc-900`, `text-zinc-100`, …). The semantic tokens are CSS variables defined in `src/index.css`; this indirection is what makes runtime theming possible. A raw `zinc-*` class cannot be themed and is treated as a bug.
- **Theming model (Obsidian-style)**: A theme is a set of values for Weaver's documented CSS variables. The built-in "Default" theme ships in app CSS and expresses the dark look entirely in tokens. User themes live as raw CSS files in `.weaver/themes/<ThemeName>/theme.css` (+ `manifest.json`) and are applied by injecting their CSS into a single `<style id="weaver-active-theme">` element — variables cascade and the whole app (chrome + editor) restyles live, with no remount. There are two token namespaces: **chrome** (`--background`, `--foreground`, `--card`, `--border`, `--sidebar`, `--primary`, `--accent`, `--muted`, `--ring`, `--destructive`, …) and **editor surface** (`--editor-bg`, `--editor-text`, `--editor-font-family`, `--editor-font-size`, `--editor-line-height`, `--editor-measure`, `--editor-heading`, `--editor-quote-border`, `--editor-link`, `--editor-selection`, …). When adding a themeable surface, add or reuse a token — do not introduce a hardcoded color.
- **Base mode**: dark base. Themes may override any token (including toward light), but the app does not ship a separate light mode.
- **Lexical editor**: Use plugin composition. Add functionality as Lexical plugins, not by modifying `Editor.tsx` core directly. The Lexical `theme` object maps node types to classes that reference `--editor-*` variables (not hardcoded colors); structural classes (margins, padding, list bullets) may stay as plain Tailwind utilities.
- **Tauri IPC**: Call Rust commands via `@tauri-apps/api/core` `invoke`. Always define TypeScript types for command arguments and return values in `src/types/`.
- **No floating menus** over editor text — this is a hard UX rule from `ARCHITECTURE.md`.

### Rust / Tauri

- All Tauri commands are defined in their per-domain module (`project.rs`, `chapters.rs`, `codex.rs`, `stickies.rs`, `stats.rs`, `themes.rs`, …) and registered in `lib.rs`'s `.invoke_handler(tauri::generate_handler![...])`. `lib.rs` holds only `run()` + registration.
- Use `serde::{Serialize, Deserialize}` for all command input/output structs, with `#[serde(rename_all = "camelCase")]` so JSON field names match the TypeScript interfaces.
- File I/O goes through Tauri commands — the frontend never accesses the filesystem directly.
- Writes are atomic: write to a hidden `.{name}.tmp` then `fs::rename` (see `util::atomic_write`).
- Add new Cargo dependencies to `src-tauri/Cargo.toml` only when needed; prefer std where possible.

### On-Disk Project Structure

Weaver projects are directories. **Content lives at the root; all app state lives in a hidden `.weaver/` directory.** The content layout stays pandoc-compatible (see `mattgemmell/pandoc-publish` pattern).

Weaver projects are directories. The layout must be pandoc-compatible (see `mattgemmell/pandoc-publish` pattern). Agreed structure (see `memory.md` for rationale):

```
<project-root>/
  project.json              # content/identity manifest: title, author, id, chapter order, etc.
  chapters/
    chapter-title.md        # lowercase kebab-case slug; order tracked in project.json
    02-...
  codex/
    characters/
      character-name.md
    places/
      place-name.md
    items/
      item-name.md
  .weaver/                  # all app state — hidden, not user content
    config.json             # active theme name + per-project app preferences
    stats.json              # word-count history / daily progress
    stickies/
      <chapter-stem>.stickies.json
    themes/
      <ThemeName>/
        manifest.json        # name, version, author, supported modes
        theme.css            # overrides Weaver's documented CSS variables
```

Filenames within `chapters/` and `codex/` use lowercase kebab-case. Chapter order is stored in `project.json`'s `chapters: string[]`, not in filename prefixes (see `memory.md`). On opening a project, the backend migrates legacy layouts (root-level `stats.json` / `stickies/`) into `.weaver/` idempotently.

### State Management

No global state library yet — use React `useState`/`useContext` until complexity demands more. Project-level state (current project, open chapter) lives in `ProjectContext`; per-device prefs in a `SettingsContext` (persisted to `localStorage`); the active theme in `ThemeContext`. Editor state stays inside Lexical.

---

## Running the App

```bash
yarn tauri dev      # full Tauri dev mode (hot reload)
yarn dev            # frontend only (browser, no Tauri APIs)
yarn build          # production build
```
