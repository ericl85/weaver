import { invoke } from '@tauri-apps/api/core';
import type {
  Project,
  Chapter,
  CodexEntry,
  FileEntry,
  Sticky,
  StickyCategory,
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

// --- Raw files ---

export function listProjectFiles(projectPath: string): Promise<FileEntry[]> {
  return invoke('list_project_files', { projectPath });
}

export function readRawFile(projectPath: string, relativePath: string): Promise<string> {
  return invoke('read_raw_file', { projectPath, relativePath });
}

export function saveRawFile(
  projectPath: string,
  relativePath: string,
  content: string,
): Promise<void> {
  return invoke('save_raw_file', { projectPath, relativePath, content });
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

// --- Stickies ---

export function readStickies(projectPath: string, chapterFilename: string): Promise<Sticky[]> {
  return invoke('read_stickies', { projectPath, chapterFilename });
}

export function saveStickies(
  projectPath: string,
  chapterFilename: string,
  stickies: Sticky[],
): Promise<void> {
  return invoke('save_stickies', { projectPath, chapterFilename, stickies });
}

export function deleteSticky(
  projectPath: string,
  chapterFilename: string,
  stickyId: string,
): Promise<void> {
  return invoke('delete_sticky', { projectPath, chapterFilename, stickyId });
}

// --- Categories ---

export function listCategories(projectPath: string): Promise<StickyCategory[]> {
  return invoke('list_categories', { projectPath });
}

export function addCategory(
  projectPath: string,
  name: string,
  color: string,
): Promise<StickyCategory> {
  return invoke('add_category', { projectPath, name, color });
}

export function updateCategory(
  projectPath: string,
  categoryId: string,
  name: string,
  color: string,
): Promise<StickyCategory> {
  return invoke('update_category', { projectPath, categoryId, name, color });
}

export function deleteCategory(projectPath: string, categoryId: string): Promise<void> {
  return invoke('delete_category', { projectPath, categoryId });
}

// --- Project metadata ---

export function updateProjectMetadata(
  projectPath: string,
  title: string,
  author: string,
): Promise<Project> {
  return invoke('update_project_metadata', { projectPath, title, author });
}
