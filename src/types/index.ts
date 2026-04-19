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

export interface Goals {
  projectWordCount?: number;
  dailyWordCount?: number;
  deadline?: string; // reserved; no behavior yet
}

export interface Project {
  id: string;
  title: string;
  author: string;
  created: string;
  rootPath: string;
  chapters: string[];
  stickyCategories: StickyCategory[];
  goals?: Goals;
}

export interface CurrentDay {
  date: string;           // "YYYY-MM-DD" local
  startingWordCount: number;
  celebrated: boolean;
}

export interface DayEntry {
  wordsWritten: number;
  totalAtEndOfDay: number;
}

export interface Stats {
  version: number;
  currentDay?: CurrentDay;
  dailyHistory: Record<string, DayEntry>; // key = "YYYY-MM-DD"
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
