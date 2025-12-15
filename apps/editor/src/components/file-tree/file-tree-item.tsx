import { memo } from "react"
import { ChevronRight, File, Folder, FolderOpen, Sparkles, Loader2, Circle } from "lucide-react"
import { cn } from "@nexo/ui"
import type { FileNode, AIStatus } from "@nexo/types"

interface FileTreeItemProps {
  node: FileNode
  depth: number
  isExpanded: boolean
  isActive: boolean
  onToggle: (id: string) => void
  onSelect: (node: FileNode) => void
}

const fileColors: Record<string, string> = {
  typescript: "text-blue-400",
  javascript: "text-yellow-400",
  json: "text-yellow-500",
  markdown: "text-slate-400",
  html: "text-orange-400",
  css: "text-blue-300",
  python: "text-green-400",
  rust: "text-orange-300",
  go: "text-cyan-400",
}

function AIBadge({ status }: { status: AIStatus }) {
  if (status === "modifying") {
    return <Loader2 className="h-3 w-3 animate-spin text-primary" />
  }
  if (status === "modified" || status === "pending" || status === "reviewing") {
    return <Sparkles className="h-3 w-3 text-primary" />
  }
  return null
}

export const FileTreeItem = memo(function FileTreeItem({
  node,
  depth,
  isExpanded,
  isActive,
  onToggle,
  onSelect,
}: FileTreeItemProps) {
  const isFolder = node.type === "folder"
  const color = node.language ? fileColors[node.language] : "text-muted-foreground"
  const aiStatus = node.state?.aiStatus ?? "none"
  const isDirty = node.state?.isDirty ?? false

  const handleClick = () => {
    if (isFolder) {
      onToggle(node.id)
    } else {
      onSelect(node)
    }
  }

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-1.5 py-1 pr-2 text-[13px] transition-colors",
        "hover:bg-accent",
        isActive && "bg-accent text-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={handleClick}
    >
      {isFolder ? (
        <>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              isExpanded && "rotate-90"
            )}
          />
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </>
      ) : (
        <>
          <span className="w-3.5" />
          <File className={cn("h-4 w-4 shrink-0", color)} />
        </>
      )}
      
      <span className={cn(
        "flex-1 truncate",
        isDirty && "italic",
        !isActive && "text-foreground/80"
      )}>
        {node.name}
      </span>

      {isDirty && aiStatus === "none" && (
        <Circle className="h-1.5 w-1.5 shrink-0 fill-foreground/50" />
      )}

      {aiStatus !== "none" && <AIBadge status={aiStatus} />}
    </div>
  )
})
