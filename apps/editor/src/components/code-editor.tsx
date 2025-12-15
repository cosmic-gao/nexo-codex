import { useState, useCallback } from "react"
import Editor, { type OnMount, type OnChange, loader } from "@monaco-editor/react"
import * as monaco from "monaco-editor"
import type { editor } from "monaco-editor"
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker"
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker"
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"
import { Loader2 } from "lucide-react"

// Configure Monaco to use local workers instead of CDN
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new jsonWorker()
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker()
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker()
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

// Use local Monaco instance instead of CDN
loader.config({ monaco })

// Cream light theme
loader.init().then((monacoInstance) => {
  monacoInstance.editor.defineTheme("nexo-cream", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "a8a29e", fontStyle: "italic" },
      { token: "keyword", foreground: "0d9488" },
      { token: "string", foreground: "059669" },
      { token: "number", foreground: "d97706" },
      { token: "type", foreground: "0891b2" },
      { token: "function", foreground: "2563eb" },
      { token: "variable", foreground: "44403c" },
    ],
    colors: {
      "editor.background": "#fdfcfa",
      "editor.foreground": "#292524",
      "editor.lineHighlightBackground": "#f5f5f4",
      "editor.selectionBackground": "#14b8a620",
      "editorLineNumber.foreground": "#a8a29e",
      "editorLineNumber.activeForeground": "#57534e",
      "editorCursor.foreground": "#0d9488",
      "editorIndentGuide.background": "#e7e5e4",
      "editorIndentGuide.activeBackground": "#d6d3d1",
      "editorGutter.background": "#fdfcfa",
      "scrollbarSlider.background": "#d6d3d140",
      "scrollbarSlider.hoverBackground": "#a8a29e60",
    },
  })
})

interface CodeEditorProps {
  defaultValue?: string
  language?: string
  onChange?: (value: string | undefined) => void
}

const defaultCode = `// Welcome to NexoCodex
// Start editing or open a project

function fibonacci(n: number): number {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

console.log(fibonacci(10))
`

export function CodeEditor({
  defaultValue = defaultCode,
  language = "typescript",
  onChange,
}: CodeEditorProps) {
  const [, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorDidMount: OnMount = useCallback((editor) => {
    setEditorInstance(editor)
    editor.focus()
  }, [])

  const handleChange: OnChange = useCallback(
    (value) => {
      onChange?.(value)
    },
    [onChange]
  )

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-border bg-[#fdfcfa]">
      <Editor
        height="100%"
        defaultLanguage={language}
        defaultValue={defaultValue}
        theme="nexo-cream"
        onMount={handleEditorDidMount}
        onChange={handleChange}
        options={{
          fontSize: 13,
          fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
          fontLigatures: true,
          lineHeight: 1.6,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          lineNumbers: "on",
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          folding: true,
          showFoldingControls: "mouseover",
          scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          overviewRulerBorder: false,
        }}
        loading={
          <div className="flex h-full items-center justify-center bg-[#fdfcfa]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      />
    </div>
  )
}
