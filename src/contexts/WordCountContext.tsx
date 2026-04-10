import { createContext, useContext, useState } from 'react';

interface WordCountContextValue {
  wordCounts: Record<string, number>;
  setWordCount: (filename: string, count: number) => void;
}

const WordCountContext = createContext<WordCountContextValue>({
  wordCounts: {},
  setWordCount: () => {},
});

export function WordCountProvider({ children }: { children: React.ReactNode }) {
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});

  function setWordCount(filename: string, count: number) {
    setWordCounts(prev => ({ ...prev, [filename]: count }));
  }

  return (
    <WordCountContext.Provider value={{ wordCounts, setWordCount }}>
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
