## 1. Project Overview
Weaver is a minimalist, offline-first, AI-assisted novel writing platform. It is designed to solve the "rush to the end" pacing problem inherent in standard LLMs by utilizing structured XML prompting, while leveraging a lightning-fast local retrieval system to inject world-building lore into the context window without wasting compute on semantic RAG.

## 2. Tech Stack
* **Frontend:** React + TypeScript + Vite (Minimalist, distraction-free UI)
* **Backend Wrapper:** Tauri (Rust) for fast, secure OS-level file system access.
* **Development Environment:** WSL2 (Linux) with GitHub Actions handling the final Windows `.exe` compilation.
* **Package Manager:** Yarn
* **AI Backend Engine:** KoboldCPP (Targeted for its "Context Shift" KV-cache retention, allowing instantaneous re-evaluations of large manuscript files via CPU offloading).

## 3. UI / UX Principles
- Markdown First: The editor should be plain text.
- Distraction-Free: No floating menus over the text. The Codex and Outline tools should exist in a collapsible sidebar.
- Explicit Control: The user is the master agent. The AI does not write unless explicitly instructed.
