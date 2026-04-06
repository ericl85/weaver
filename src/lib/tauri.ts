import { invoke } from '@tauri-apps/api/core';
import type {
  Project,
  Chapter,
  CodexEntry,
  OutlineItem,
} from '../types';

// --- Project ---

export function createProject(
  title: string,
  author: string,
  path: string,
): Promise<Project> {
  return invoke('create_project', { title, author, path });
}

export function openProject(path: string): Promise<Project> {
  return invoke('open_project', { path });
}

// --- Chapters ---

export function listChapters(projectPath: string): Promise<Chapter[]> {
  return invoke('list_chapters', { projectPath });
}

export function readChapter(projectPath: string, filename: string): Promise<string> {
  return invoke('read_chapter', { projectPath, filename });
}

export function saveChapter(
  projectPath: string,
  filename: string,
  content: string,
): Promise<void> {
  return invoke('save_chapter', { projectPath, filename, content });
}

export function createChapter(projectPath: string, title: string): Promise<Chapter> {
  return invoke('create_chapter', { projectPath, title });
}

export function renameChapter(
  projectPath: string,
  filename: string,
  newTitle: string,
): Promise<Chapter> {
  return invoke('rename_chapter', { projectPath, filename, newTitle });
}

export function deleteChapter(projectPath: string, filename: string): Promise<void> {
  return invoke('delete_chapter', { projectPath, filename });
}

export function reorderChapters(
  projectPath: string,
  filenames: string[],
): Promise<void> {
  return invoke('reorder_chapters', { projectPath, filenames });
}

// --- Outline ---

export function readOutline(
  projectPath: string,
  chapterFilename: string,
): Promise<OutlineItem[]> {
  return invoke('read_outline', { projectPath, chapterFilename });
}

export function saveOutline(
  projectPath: string,
  chapterFilename: string,
  items: OutlineItem[],
): Promise<void> {
  return invoke('save_outline', { projectPath, chapterFilename, items });
}

// --- Codex ---

export function listCodex(projectPath: string): Promise<CodexEntry[]> {
  return invoke('list_codex', { projectPath });
}

export function readCodexEntry(
  projectPath: string,
  category: string,
  filename: string,
): Promise<string> {
  return invoke('read_codex_entry', { projectPath, category, filename });
}

export function saveCodexEntry(
  projectPath: string,
  category: string,
  filename: string,
  content: string,
): Promise<void> {
  return invoke('save_codex_entry', { projectPath, category, filename, content });
}

export function createCodexEntry(
  projectPath: string,
  category: string,
  title: string,
): Promise<CodexEntry> {
  return invoke('create_codex_entry', { projectPath, category, title });
}

export function deleteCodexEntry(
  projectPath: string,
  category: string,
  filename: string,
): Promise<void> {
  return invoke('delete_codex_entry', { projectPath, category, filename });
}
