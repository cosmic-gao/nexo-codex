import { useState, useCallback, useRef } from "react"
import { CodeEditor } from "@/components/code-editor"
import { EditorHeader } from "@/components/editor-header"
import { EditorFooter } from "@/components/editor-footer"

function App() {
  const [language, setLanguage] = useState("typescript")
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const codeRef = useRef<string>("")

  const handleCodeChange = useCallback((value: string | undefined) => {
    codeRef.current = value ?? ""
  }, [])

  const handleRun = useCallback(() => {
    console.log("Running code:", codeRef.current)
    // TODO: Implement code execution
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeRef.current)
      console.log("Code copied to clipboard")
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }, [])

  const handleDownload = useCallback(() => {
    const extensions: Record<string, string> = {
      typescript: "ts",
      javascript: "js",
      python: "py",
      rust: "rs",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      html: "html",
      css: "css",
      json: "json",
      markdown: "md",
    }
    const ext = extensions[language] || "txt"
    const blob = new Blob([codeRef.current], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `code.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [language])

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Ambient background effect */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <EditorHeader
        language={language}
        onLanguageChange={setLanguage}
        onRun={handleRun}
        onCopy={handleCopy}
        onDownload={handleDownload}
      />

      <main className="relative flex-1 overflow-hidden p-4">
        <CodeEditor
          language={language}
          onChange={handleCodeChange}
        />
      </main>

      <EditorFooter language={language} cursorPosition={cursorPosition} />
    </div>
  )
}

export default App
