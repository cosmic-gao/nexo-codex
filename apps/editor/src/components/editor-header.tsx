import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Play, Copy, Download, Settings, Sparkles } from "lucide-react"

interface EditorHeaderProps {
  language: string
  onLanguageChange: (language: string) => void
  onRun?: () => void
  onCopy?: () => void
  onDownload?: () => void
}

const languages = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
]

export function EditorHeader({
  language,
  onLanguageChange,
  onRun,
  onCopy,
  onDownload,
}: EditorHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card/50 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            <span className="text-primary">Nexo</span>
            <span className="text-muted-foreground">Codex</span>
          </h1>
        </div>
        
        <div className="h-6 w-px bg-border" />
        
        <div className="w-36">
          <Select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            options={languages}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onCopy} title="Copy code">
          <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDownload} title="Download">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
        <div className="ml-2 h-6 w-px bg-border" />
        <Button onClick={onRun} className="gap-2">
          <Play className="h-4 w-4" />
          Run
        </Button>
      </div>
    </header>
  )
}

