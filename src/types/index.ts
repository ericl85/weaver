export interface Project {
  id: string;
  title: string;
  author: string;
  created: string;
  rootPath: string;
  chapters: string[];
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

export interface OutlineItem {
  id: string;
  chapterId: string;
  text: string;
  anchorId: string;
  type: 'note' | 'todo' | 'feedback';
}

export interface Theme {
  name: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}
