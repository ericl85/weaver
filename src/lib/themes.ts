// Injects an active theme's raw CSS into a single <style id="weaver-active-theme">
// element in <head>. Because chrome and editor surfaces read CSS variables, this
// one injection restyles the whole app live — no remount. Passing null empties the
// element, falling back to the built-in Default tokens shipped in :root.
const ACTIVE_THEME_STYLE_ID = 'weaver-active-theme';

export function injectThemeCss(css: string | null): void {
  let el = document.getElementById(ACTIVE_THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = ACTIVE_THEME_STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css ?? '';
}

// Lexical theme: maps node types to CSS class names.
// Color/font/size come from --editor-* CSS variable classes (editor-*).
// Structural utilities (spacing, indents, bullets) stay as Tailwind classes.
// Syntax highlight classes are kept as raw color utilities — they carry
// semantic meaning (keyword, error, string) and are not chrome colors.
export const lexicalTheme = {
  paragraph: "editor-paragraph indent-4",
  heading: {
    h1: "editor-h1 font-bold mb-4 mt-6",
    h2: "editor-h2 font-semibold mb-3 mt-5",
    h3: "editor-h3 font-semibold mb-2 mt-4",
  },
  quote: "editor-quote border-l-4 pl-4 italic my-4",
  list: {
    ul: "list-disc pl-6 mb-4",
    ol: "list-decimal pl-6 mb-4",
    listitem: "mb-1",
    nested: {
      listitem: "list-none",
    },
  },
  code: "editor-code block font-mono rounded p-4 my-4 text-sm overflow-x-auto",
  codeHighlight: {
    atrule: "text-blue-400",
    attr: "text-green-400",
    boolean: "text-orange-400",
    builtin: "text-yellow-400",
    cdata: "text-zinc-500",
    char: "text-green-400",
    class: "text-yellow-400",
    "class-name": "text-yellow-400",
    comment: "text-zinc-500 italic",
    constant: "text-orange-400",
    deleted: "text-red-400",
    doctype: "text-zinc-500",
    entity: "text-orange-400",
    function: "text-yellow-400",
    important: "text-orange-400",
    inserted: "text-green-400",
    keyword: "text-blue-400",
    namespace: "text-zinc-300",
    number: "text-orange-400",
    operator: "text-zinc-300",
    prolog: "text-zinc-500",
    property: "text-green-400",
    punctuation: "text-zinc-400",
    regex: "text-green-400",
    selector: "text-green-400",
    string: "text-green-400",
    symbol: "text-orange-400",
    tag: "text-red-400",
    url: "text-blue-400",
    variable: "text-orange-400",
  },
  hr: "editor-hr my-6 border-t",
  link: "editor-link underline cursor-pointer",
  text: {
    bold: "font-bold",
    italic: "italic",
    strikethrough: "line-through",
    code: "editor-inline-code font-mono rounded px-1 py-0.5 text-sm",
    underline: "underline",
    underlineStrikethrough: "underline line-through",
  },
};
