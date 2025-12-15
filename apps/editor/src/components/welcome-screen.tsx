import { 
  FileCode, 
  FolderOpen, 
  Sparkles, 
  Keyboard,
  Code2,
  ArrowRight
} from "lucide-react"
import { Button } from "@nexo/ui"

interface WelcomeScreenProps {
  onOpenRepo?: () => void
}

const shortcuts = [
  { keys: ["⌘", "O"], action: "Open project" },
  { keys: ["⌘", "S"], action: "Save" },
  { keys: ["⌘", "P"], action: "Quick open" },
]

export function WelcomeScreen({ onOpenRepo }: WelcomeScreenProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-8 max-w-md text-center">
        {/* Logo */}
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
          <Code2 className="h-8 w-8 text-primary-foreground" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">NexoCodex</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Open a project to start editing
          </p>
        </div>

        {/* CTA */}
        <Button onClick={onOpenRepo} className="gap-2">
          <FolderOpen className="h-4 w-4" />
          Open Project
          <ArrowRight className="h-4 w-4" />
        </Button>

        {/* Features */}
        <div className="grid w-full gap-3 mt-4">
          <div className="flex items-center gap-3 rounded-lg border border-border p-3 text-left">
            <FileCode className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Code Editor</div>
              <div className="text-xs text-muted-foreground">Monaco with syntax highlighting</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 rounded-lg border border-border p-3 text-left">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">AI Assistance</div>
              <div className="text-xs text-muted-foreground">Review and apply suggestions</div>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="flex items-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <Keyboard className="h-4 w-4" />
          {shortcuts.map((s) => (
            <div key={s.action} className="flex items-center gap-1">
              {s.keys.map((k, i) => (
                <span key={i}>
                  <kbd className="rounded bg-secondary px-1 py-0.5 font-mono text-[10px]">{k}</kbd>
                  {i < s.keys.length - 1 && <span className="mx-0.5">+</span>}
                </span>
              ))}
              <span className="ml-1">{s.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
