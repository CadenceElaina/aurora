"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorView, keymap } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { useMemo } from "react";

/**
 * Aurora dark theme for CodeMirror — matches the Deep Space palette.
 * No auto-indent to simulate whiteboard/interview conditions.
 */
const auroraTheme = createTheme({
  theme: "dark",
  settings: {
    background: "var(--muted)",          // #16121f
    foreground: "var(--foreground)",      // #ede9f6
    caret: "var(--accent)",              // #c084fc
    selection: "rgba(192, 132, 252, 0.15)",
    selectionMatch: "rgba(192, 132, 252, 0.08)",
    lineHighlight: "rgba(192, 132, 252, 0.05)",
    gutterBackground: "transparent",
    gutterForeground: "var(--muted-foreground)",
    gutterBorder: "transparent",
  },
  styles: [
    { tag: t.comment, color: "#6b5f7d" },
    { tag: t.keyword, color: "#c084fc" },
    { tag: [t.string, t.special(t.brace)], color: "#34d399" },
    { tag: t.number, color: "#fbbf24" },
    { tag: t.bool, color: "#f472b6" },
    { tag: t.variableName, color: "#ede9f6" },
    { tag: [t.definition(t.variableName), t.function(t.variableName)], color: "#93c5fd" },
    { tag: t.typeName, color: "#f472b6" },
    { tag: t.operator, color: "#9b8fb5" },
    { tag: t.className, color: "#f472b6" },
    { tag: [t.propertyName, t.attributeName], color: "#93c5fd" },
    { tag: t.bracket, color: "#9b8fb5" },
    { tag: t.self, color: "#f472b6" },
    { tag: t.null, color: "#f472b6" },
  ],
});

/** Base editor styling — minimal chrome, matches card layout */
const baseThemeExt = EditorView.theme({
  "&": {
    fontSize: "14px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "rgba(192, 132, 252, 0.5)",
  },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
    padding: "8px 0",
    lineHeight: "1.6",
  },
  ".cm-content": {
    padding: "0 12px",
  },
  ".cm-gutters": {
    border: "none",
    paddingLeft: "4px",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
  },
  // Placeholder styling
  ".cm-placeholder": {
    color: "var(--muted-foreground)",
    opacity: "0.5",
    fontStyle: "italic",
  },
});

/**
 * Disable all auto-indent — simulates interview/whiteboard conditions.
 * Override Enter to just insert a newline without indentation.
 */
const noAutoIndent = keymap.of([
  {
    key: "Enter",
    run: (view) => {
      view.dispatch(view.state.replaceSelection("\n"));
      return true;
    },
  },
]);

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  onSubmit?: () => void;
}

export function CodeEditor({
  value,
  onChange,
  placeholder = "Write your code here…",
  minHeight = "120px",
  autoFocus = false,
  readOnly = false,
  onSubmit,
}: CodeEditorProps) {
  const extensions = useMemo(() => {
    const exts = [
      python(),
      baseThemeExt,
      noAutoIndent,
      indentUnit.of("    "),
      EditorView.lineWrapping,
      // Ctrl+Shift+Enter to submit
      ...(onSubmit
        ? [
            keymap.of([
              {
                key: "Ctrl-Shift-Enter",
                run: () => {
                  onSubmit();
                  return true;
                },
              },
            ]),
          ]
        : []),
    ];
    if (readOnly) {
      exts.push(EditorView.editable.of(false));
    }
    return exts;
  }, [onSubmit, readOnly]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={auroraTheme}
      extensions={extensions}
      placeholder={placeholder}
      autoFocus={autoFocus}
      minHeight={minHeight}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: false,
        highlightActiveLineGutter: false,
        autocompletion: false,
        bracketMatching: true,
        closeBrackets: false,
        indentOnInput: false,
        tabSize: 4,
        searchKeymap: false,
        history: true,
      }}
    />
  );
}
