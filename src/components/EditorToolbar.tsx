import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Toggle } from './ui/toggle';
import { useStickyContext } from '../contexts/StickyContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  $createParagraphNode,
} from 'lexical';
import {
  $isHeadingNode,
  $createHeadingNode,
  $isQuoteNode,
  $createQuoteNode,
} from '@lexical/rich-text';
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list';
import { $isCodeNode, $createCodeNode } from '@lexical/code';
import { $setBlocksType } from '@lexical/selection';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'ul' | 'ol' | 'code';

interface FormatState {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  inlineCode: boolean;
  blockType: BlockType;
}

function btnClass(active: boolean) {
  return (
    'px-2 py-0.5 rounded text-xs transition-colors ' +
    (active
      ? 'bg-zinc-700 text-zinc-100'
      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60')
  );
}

function Sep() {
  return <div className="w-px h-4 bg-zinc-700 mx-1 shrink-0" />;
}

export default function EditorToolbar() {
  const [editor] = useLexicalComposerContext();
  const { badgesVisible, setBadgesVisible } = useStickyContext();
  const [fmt, setFmt] = useState<FormatState>({
    bold: false,
    italic: false,
    strikethrough: false,
    inlineCode: false,
    blockType: 'paragraph',
  });

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        const anchorNode = selection.anchor.getNode();
        let blockType: BlockType = 'paragraph';

        if (anchorNode.getKey() !== 'root') {
          try {
            const topNode = anchorNode.getTopLevelElementOrThrow();
            if ($isHeadingNode(topNode)) {
              const tag = topNode.getTag();
              if (tag === 'h1' || tag === 'h2' || tag === 'h3') blockType = tag;
            } else if ($isListNode(topNode)) {
              blockType = topNode.getListType() === 'bullet' ? 'ul' : 'ol';
            } else if ($isQuoteNode(topNode)) {
              blockType = 'quote';
            } else if ($isCodeNode(topNode)) {
              blockType = 'code';
            }
          } catch (_) {
            // root node — leave as paragraph
          }
        }

        setFmt({
          bold: selection.hasFormat('bold'),
          italic: selection.hasFormat('italic'),
          strikethrough: selection.hasFormat('strikethrough'),
          inlineCode: selection.hasFormat('code'),
          blockType,
        });
      });
    });
  }, [editor]);

  const formatText = useCallback(
    (format: 'bold' | 'italic' | 'strikethrough' | 'code') => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    },
    [editor]
  );

  const applyBlockType = useCallback(
    (type: BlockType) => {
      if (type === 'ul') {
        editor.dispatchCommand(
          fmt.blockType === 'ul' ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
          undefined
        );
        return;
      }
      if (type === 'ol') {
        editor.dispatchCommand(
          fmt.blockType === 'ol' ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
          undefined
        );
        return;
      }
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (type === fmt.blockType) {
          $setBlocksType(selection, () => $createParagraphNode());
        } else if (type === 'h1' || type === 'h2' || type === 'h3') {
          $setBlocksType(selection, () => $createHeadingNode(type));
        } else if (type === 'quote') {
          $setBlocksType(selection, () => $createQuoteNode());
        } else if (type === 'code') {
          $setBlocksType(selection, () => $createCodeNode());
        }
      });
    },
    [editor, fmt.blockType]
  );

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700 shrink-0 flex-wrap">
      {/* Text formatting */}
      <button
        className={btnClass(fmt.bold)}
        onClick={() => formatText('bold')}
        title="Bold (Ctrl+B)"
        aria-label="Bold"
      >
        <span className="font-bold">B</span>
      </button>
      <button
        className={btnClass(fmt.italic)}
        onClick={() => formatText('italic')}
        title="Italic (Ctrl+I)"
        aria-label="Italic"
      >
        <span className="italic">I</span>
      </button>
      <button
        className={btnClass(fmt.strikethrough)}
        onClick={() => formatText('strikethrough')}
        title="Strikethrough"
        aria-label="Strikethrough"
      >
        <span className="line-through">S</span>
      </button>
      <button
        className={btnClass(fmt.inlineCode)}
        onClick={() => formatText('code')}
        title="Inline code"
        aria-label="Inline code"
      >
        <span className="font-mono text-[11px]">&lt;/&gt;</span>
      </button>

      <Sep />

      {/* Headings */}
      <button
        className={btnClass(fmt.blockType === 'h1')}
        onClick={() => applyBlockType('h1')}
        title="Heading 1"
        aria-label="Heading 1"
      >
        H1
      </button>
      <button
        className={btnClass(fmt.blockType === 'h2')}
        onClick={() => applyBlockType('h2')}
        title="Heading 2"
        aria-label="Heading 2"
      >
        H2
      </button>
      <button
        className={btnClass(fmt.blockType === 'h3')}
        onClick={() => applyBlockType('h3')}
        title="Heading 3"
        aria-label="Heading 3"
      >
        H3
      </button>

      <Sep />

      {/* Lists */}
      <button
        className={btnClass(fmt.blockType === 'ul')}
        onClick={() => applyBlockType('ul')}
        title="Bullet list"
        aria-label="Bullet list"
      >
        •—
      </button>
      <button
        className={btnClass(fmt.blockType === 'ol')}
        onClick={() => applyBlockType('ol')}
        title="Numbered list"
        aria-label="Numbered list"
      >
        1.
      </button>

      <Sep />

      {/* Block types */}
      <button
        className={btnClass(fmt.blockType === 'quote')}
        onClick={() => applyBlockType('quote')}
        title="Blockquote"
        aria-label="Blockquote"
      >
        ❝
      </button>
      <button
        className={btnClass(fmt.blockType === 'code')}
        onClick={() => applyBlockType('code')}
        title="Code block"
        aria-label="Code block"
      >
        <span className="font-mono text-[11px]">{'{}'}</span>
      </button>

      <Sep />

      {/* Horizontal rule */}
      <button
        className={btnClass(false)}
        onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)}
        title="Horizontal rule (scene break)"
        aria-label="Insert horizontal rule"
      >
        ―
      </button>

      <Sep />

      {/* Stickies visibility toggle */}
      <Toggle
        size="sm"
        pressed={badgesVisible}
        onPressedChange={setBadgesVisible}
        title={badgesVisible ? 'Hide sticky badges' : 'Show sticky badges'}
        aria-label="Toggle sticky badges"
        className="text-zinc-400 data-[state=on]:text-zinc-100"
      >
        <span className="text-[11px]">📌</span>
      </Toggle>
    </div>
  );
}
