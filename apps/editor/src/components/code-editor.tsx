import { useState, useCallback } from "react"
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react"
import type { editor } from "monaco-editor"

interface CodeEditorProps {
  defaultValue?: string
  language?: string
  onChange?: (value: string | undefined) => void
}

const defaultCode = `// Welcome to Nexo Codex Editor
// A minimal online code editor

function fibonacci(n: number): number {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

const result = fibonacci(10)
console.log(\`Fibonacci(10) = \${result}\`)

// Try editing this code!
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
    <div className="h-full w-full overflow-hidden rounded-lg border border-border bg-[#0d1117]">
      <Editor
        height="100%"
        defaultLanguage={language}
        defaultValue={defaultValue}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        onChange={handleChange}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          lineNumbers: "on",
          renderLineHighlight: "all",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          automaticLayout: true,
          tabSize: 2,
          wordWrap: "on",
          formatOnPaste: true,
          formatOnType: true,
        }}
        loading={
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading editor...</span>
            </div>
          </div>
        }
      />
    </div>
  )
}

