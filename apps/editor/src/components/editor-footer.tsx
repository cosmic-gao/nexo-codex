import { GitBranch, Circle } from "lucide-react"

interface EditorFooterProps {
  language: string
  cursorPosition?: { line: number; column: number }
  branchName?: string
}

export function EditorFooter({ 
  language, 
  cursorPosition,
  branchName = "main"
}: EditorFooterProps) {
  return (
    <footer className="flex h-6 items-center justify-between border-t border-border bg-card px-3 text-[11px] text-muted-foreground">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Circle className="h-2 w-2 fill-success text-success" />
          <span>Ready</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" />
          <span>{branchName}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {cursorPosition && (
          <span className="tabular-nums">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}
        <span className="uppercase">{language}</span>
        <span>UTF-8</span>
      </div>
    </footer>
  )
}
