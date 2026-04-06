## 1. Project Overview

Weaver is a minimalist, offline-first, novel writing platform.

## 2. Tech Stack

- **Frontend:** React + TypeScript + Vite (Minimalist, distraction-free UI)
- **Backend Wrapper:** Tauri (Rust) for fast, secure OS-level file system access.
- **Development Environment:** WSL2 (Linux) with GitHub Actions handling the final Windows `.exe` compilation.
- **Package Manager:** Yarn

## 3. UI / UX Principles

- Markdown First: The editor should be plain text.
- Distraction-Free: No floating menus over the text. The Codex and Outline tools should exist in collapsible sidebars.
