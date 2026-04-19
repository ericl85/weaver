import { createContext, useContext, useState } from 'react';

interface WordCountContextValue {
  wordCounts: Record<string, number>;
  setWordCount: (filename: string, count: number) => void;
  projectTotal: number | null;
  setProjectTotal: (total: number) => void;
}

const WordCountContext = createContext<WordCountContextValue>({
  wordCounts: {},
  setWordCount: () => {},
  projectTotal: null,
  setProjectTotal: () => {},
});

export function WordCountProvider({ children }: { children: React.ReactNode }) {
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});
  const [projectTotal, setProjectTotal] = useState<number | null>(null);

  function setWordCount(filename: string, count: number) {
    setWordCounts(prev => ({ ...prev, [filename]: count }));
  }

  return (
    <WordCountContext.Provider value={{ wordCounts, setWordCount, projectTotal, setProjectTotal }}>
      {children}
    </WordCountContext.Provider>
  );
}

export function useWordCount() {
  return useContext(WordCountContext);
}

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}
