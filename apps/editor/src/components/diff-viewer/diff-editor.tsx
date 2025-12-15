import { useRef, useEffect, useCallback } from "react"
import { DiffEditor as MonacoDiffEditor, type DiffOnMount } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import { Loader2 } from "lucide-react"

interface DiffEditorProps {
  originalContent: string
  modifiedContent: string
  language: string
  onModifiedChange?: (value: string) => void
  readOnly?: boolean
}

export function DiffEditor({
  originalContent,
  modifiedContent,
  language,
  onModifiedChange,
  readOnly = false,
}: DiffEditorProps) {
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)

  const handleEditorDidMount: DiffOnMount = useCallback((editor) => {
    editorRef.current = editor
    const modifiedEditor = editor.getModifiedEditor()
    modifiedEditor.onDidChangeModelContent(() => {
      onModifiedChange?.(modifiedEditor.getValue())
    })
  }, [onModifiedChange])

  useEffect(() => {
    if (editorRef.current) {
      const originalModel = editorRef.current.getOriginalEditor().getModel()
      const modifiedModel = editorRef.current.getModifiedEditor().getModel()
      
      if (originalModel && originalModel.getValue() !== originalContent) {
        originalModel.setValue(originalContent)
      }
      if (modifiedModel && modifiedModel.getValue() !== modifiedContent) {
        modifiedModel.setValue(modifiedContent)
      }
    }
  }, [originalContent, modifiedContent])

  return (
    <div className="h-full w-full overflow-hidden rounded-lg border border-border bg-[#fdfcfa]">
      <MonacoDiffEditor
        height="100%"
        language={language}
        original={originalContent}
        modified={modifiedContent}
        theme="vs"
        onMount={handleEditorDidMount}
        options={{
          fontSize: 12,
          fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 8, bottom: 8 },
          lineNumbers: "on",
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          smoothScrolling: true,
          automaticLayout: true,
          readOnly,
          originalEditable: false,
          renderSideBySide: true,
          enableSplitViewResizing: true,
          renderOverviewRuler: false,
          diffWordWrap: "on",
          ignoreTrimWhitespace: false,
          renderIndicators: true,
          renderMarginRevertIcon: false,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
        }}
        loading={
          <div className="flex h-full items-center justify-center bg-[#fdfcfa]">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      />
    </div>
  )
}
