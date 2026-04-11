export interface StickyCategory {
  id: string;
  name: string;
  color: string; // Tailwind color name, e.g. "amber", "blue", "emerald", "zinc"
}

export interface Sticky {
  id: string;
  chapterId: string;
  text: string;
  categoryId: string;
  anchorId: string | null; // null = unattached; string = UUID matching <!-- weaver-sticky:{id} -->
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  author: string;
  created: string;
  rootPath: string;
  chapters: string[];
  stickyCategories: StickyCategory[];
}

export interface Chapter {
  id: string;
  title: string;
  filename: string;
  order: number;
  wordCount?: number;
}

export interface CodexEntry {
  id: string;
  title: string;
  category: string;
  filename: string;
}

export interface FileEntry {
  path: string;
  isDir: boolean;
}

export interface Theme {
  name: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  textAlign: 'left' | 'justify';
}
