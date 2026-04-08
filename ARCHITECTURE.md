## 1. Project Overview

Weaver is a minimalist, offline-first, novel writing platform.

## 2. Tech Stack

- **Frontend:** React + TypeScript + Vite (Minimalist, distraction-free UI)
- **Backend Wrapper:** Tauri (Rust) for fast, secure OS-level file system access.
- **Development Environment:** WSL2 (Linux) with GitHub Actions handling the final Windows `.exe` compilation.
- **Package Manager:** Yarn

## 3. UI / UX Principles

- Rich Text Editing, Markdown Storage: The editor uses Lexical as a rich text editor — users see formatted text (bold, italic, headings, lists, etc.) as they type. Files are stored as Markdown on disk. There is no separate preview panel because the editor *is* the rendered view.
- Distraction-Free: No floating menus over the text. The formatting toolbar is a fixed bar above the editor, not a floating popup. The Codex and Outline tools exist in collapsible sidebars.
