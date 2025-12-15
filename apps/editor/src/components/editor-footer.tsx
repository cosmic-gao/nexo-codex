import { GitBranch, Circle } from "lucide-react"

interface EditorFooterProps {
  language: string
  cursorPosition?: { line: number; column: number }
}

export function EditorFooter({ language, cursorPosition }: EditorFooterProps) {
  return (
    <footer className="flex h-7 items-center justify-between border-t border-border bg-card/30 px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
          <span>Ready</span>
        </div>
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3 w-3" />
          <span>main</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {cursorPosition && (
          <span>
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </span>
        )}
        <span className="uppercase">{language}</span>
        <span>UTF-8</span>
      </div>
    </footer>
  )
}

