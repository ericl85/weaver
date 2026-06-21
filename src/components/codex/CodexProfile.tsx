import { useState, useEffect, useRef, useCallback } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useCodex } from '../../contexts/CodexContext';
import { useJumpToOccurrence } from '../../lib/jumpToOccurrence';
import { readCodexEntry, saveCodexEntry, findReferences } from '../../lib/tauri';
import type { CodexEntry, Occurrence, ReferenceHit } from '../../types';
import CodexNotesEditor from './CodexNotesEditor';

const SAVE_DEBOUNCE_MS = 1000;

interface Props {
  entry: CodexEntry;
}

/** Split a snippet into pre / matched / post using the Rust char offsets.
 *  Array.from splits by code point so it lines up with Rust's char counting. */
function renderSnippet(o: Occurrence) {
  const chars = Array.from(o.snippet);
  const start = o.snippetMatchStart;
  const end = o.snippetMatchStart + o.snippetMatchLen;
  const pre = chars.slice(0, start).join('');
  const mid = chars.slice(start, end).join('');
  const post = chars.slice(end).join('');
  return (
    <span className="break-words">
      …{pre}
      <mark className="bg-accent text-accent-foreground rounded-sm px-0.5">{mid}</mark>
      {post}…
    </span>
  );
}

/**
 * Center-pane entity profile for one codex entry. Layout is horizontal: notes
 * (rich text, capped to --editor-measure) on the left, a Mentions backlink rail
 * on the right. Aliases are edited inline as chips; notes auto-save (1s) + Ctrl+S.
 */
export default function CodexProfile({ entry }: Props) {
  const { project, chapters } = useProject();
  const { openCodexEntry } = useCodex();
  const jump = useJumpToOccurrence();

  const matchCase = entry.matchCase;

  const [aliases, setAliases] = useState<string[]>(entry.aliases);
  const [newAlias, setNewAlias] = useState('');
  const [initialNotes, setInitialNotes] = useState<string | null>(null);
  const [mentions, setMentions] = useState<ReferenceHit[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);

  // Refs so the debounced/unmount saves always read the freshest values without
  // a stale closure clobbering a just-added alias (or vice versa).
  const latestNotes = useRef('');
  const aliasesRef = useRef<string[]>(entry.aliases);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const save = useCallback(
    (content: string, aliasList: string[]) => {
      if (!project) return;
      saveCodexEntry(
        project.rootPath,
        entry.category,
        entry.filename,
        content,
        aliasList,
        matchCase,
      ).catch(console.error);
    },
    [project, entry.category, entry.filename, matchCase],
  );

  const runMentions = useCallback(
    (aliasList: string[]) => {
      if (!project) return;
      setMentionsLoading(true);
      findReferences(project.rootPath, [entry.title, ...aliasList], matchCase)
        .then(setMentions)
        .catch(console.error)
        .finally(() => setMentionsLoading(false));
    },
    [project, entry.title, matchCase],
  );

  // Load the notes body once (component is keyed by entry.id, so a new entry
  // remounts with fresh state and a fresh Lexical instance).
  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    readCodexEntry(project.rootPath, entry.category, entry.filename)
      .then((res) => {
        if (cancelled) return;
        latestNotes.current = res.content;
        aliasesRef.current = res.entry.aliases;
        setAliases(res.entry.aliases);
        setInitialNotes(res.content);
        runMentions(res.entry.aliases);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, entry.category, entry.filename]);

  // Flush any pending save on unmount (entry switch / profile close).
  useEffect(() => {
    return () => {
      if (saveTimer.current !== undefined) {
        clearTimeout(saveTimer.current);
        save(latestNotes.current, aliasesRef.current);
      }
    };
  }, [save]);

  const handleNotesChange = useCallback(
    (markdown: string) => {
      latestNotes.current = markdown;
      if (saveTimer.current !== undefined) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = undefined;
        save(latestNotes.current, aliasesRef.current);
      }, SAVE_DEBOUNCE_MS);
    },
    [save],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimer.current !== undefined) {
          clearTimeout(saveTimer.current);
          saveTimer.current = undefined;
        }
        save(latestNotes.current, aliasesRef.current);
      }
    },
    [save],
  );

  function commitAliases(next: string[]) {
    setAliases(next);
    aliasesRef.current = next;
    save(latestNotes.current, next);
    runMentions(next);
  }

  function handleAddAlias() {
    const a = newAlias.trim();
    setNewAlias('');
    if (!a || aliases.includes(a)) return;
    commitAliases([...aliases, a]);
  }

  function handleRemoveAlias(alias: string) {
    commitAliases(aliases.filter((x) => x !== alias));
  }

  function handleMentionClick(chapterFilename: string, needle: string, ordinal: number) {
    jump(chapterFilename, needle, ordinal, matchCase);
    openCodexEntry(null); // reveal the manuscript so the jump lands in view
  }

  const chapterTitle = (filename: string) =>
    chapters.find((c) => c.filename === filename)?.title ?? filename;

  const totalMentions = mentions.reduce((n, h) => n + h.occurrences.length, 0);

  return (
    <div className="absolute inset-0 flex flex-col bg-background" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground truncate">{entry.title}</h1>
          <span className="text-xs text-muted-foreground capitalize">{entry.category}</span>
          <button
            onClick={() => openCodexEntry(null)}
            title="Close"
            className="ml-auto text-muted-foreground hover:text-foreground text-sm leading-none"
          >
            ✕
          </button>
        </div>

        {/* Aliases */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Aliases</span>
          {aliases.map((alias) => (
            <span
              key={alias}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary border border-border text-xs text-foreground"
            >
              {alias}
              <button
                onClick={() => handleRemoveAlias(alias)}
                title="Remove alias"
                className="text-muted-foreground hover:text-destructive leading-none"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAlias();
              }
            }}
            onBlur={handleAddAlias}
            placeholder="+ add alias"
            className="w-24 bg-transparent border-b border-border px-1 py-0.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
          />
        </div>
      </div>

      {/* Body: notes (left) + mentions rail (right) */}
      <div className="flex-1 min-h-0 flex">
        {/* Notes */}
        <div className="flex-1 min-w-0 flex flex-col">
          {initialNotes !== null && (
            <CodexNotesEditor
              initialContent={initialNotes}
              onContentChange={handleNotesChange}
            />
          )}
        </div>

        {/* Mentions rail */}
        <aside className="w-80 shrink-0 border-l border-border flex flex-col bg-card/40">
          <div className="shrink-0 px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mentions
            </span>
            <span className="text-xs text-muted-foreground">· {totalMentions}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {mentionsLoading && mentions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Scanning manuscript…</p>
            ) : mentions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No mentions found in the manuscript yet.
              </p>
            ) : (
              mentions.map((hit) => (
                <div key={hit.chapter}>
                  <div className="text-xs font-medium text-foreground mb-1 truncate">
                    {chapterTitle(hit.chapter)}
                  </div>
                  <ul className="space-y-1">
                    {hit.occurrences.map((o, i) => (
                      <li key={`${o.matchedAlias}-${o.ordinal}-${i}`}>
                        <button
                          onClick={() =>
                            handleMentionClick(hit.chapter, o.matchedAlias, o.ordinal)
                          }
                          className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded px-2 py-1 leading-snug"
                        >
                          {renderSnippet(o)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
