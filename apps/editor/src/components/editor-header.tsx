import { 
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@nexo/ui"
import { 
  Play, 
  Copy, 
  Download, 
  Settings, 
  FolderOpen, 
  Search,
  Code2
} from "lucide-react"

interface EditorHeaderProps {
  repoName?: string
  onRun?: () => void
  onCopy?: () => void
  onDownload?: () => void
  onOpenRepo?: () => void
  onSearch?: () => void
}

export function EditorHeader({
  repoName,
  onRun,
  onCopy,
  onDownload,
  onOpenRepo,
  onSearch,
}: EditorHeaderProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Code2 className="h-4 w-4 text-primary-foreground" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold text-foreground">NexoCodex</span>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Project */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onOpenRepo} 
          className="h-7 gap-2 px-2.5 text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          <span className="max-w-[140px] truncate text-xs">
            {repoName || "Open Project"}
          </span>
        </Button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onSearch}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Search (⌘P)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onCopy}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onDownload}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Download</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Settings</TooltipContent>
        </Tooltip>

        <div className="mx-2 h-5 w-px bg-border" />

        <Button 
          onClick={onRun} 
          size="sm"
          className="h-7 gap-1.5 px-3 text-xs font-medium"
        >
          <Play className="h-3 w-3" fill="currentColor" />
          Run
        </Button>
      </div>
    </header>
  )
}
