import { useState, useCallback, useRef, useEffect, memo } from "react"
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  FolderPlus,
  FilePlus,
  Search,
  Layers
} from "lucide-react"
import { cn, Button, ScrollArea } from "@nexo/ui"
import { FileTreeItem } from "./file-tree-item"
import type { FileNode } from "@nexo/types"

interface FileTreeProps {
  files: FileNode[]
  activeFileId: string | null
  onFileSelect: (node: FileNode) => void
  onRefresh?: () => void
  onNewFile?: () => void
  onNewFolder?: () => void
  projectName?: string
}

const MIN_WIDTH = 160
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 224 // 14rem = 224px

export const FileTree = memo(function FileTree({
  files,
  activeFileId,
  onFileSelect,
  onRefresh,
  onNewFile,
  onNewFolder,
  projectName = "nexo-codex",
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["1", "1-3"])
  )
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLElement>(null)

  // Handle resize drag
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return
      const newWidth = e.clientX
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const renderTree = useCallback(
    (nodes: FileNode[], depth: number = 0) => {
      return nodes.map((node) => (
        <div key={node.id}>
          <FileTreeItem
            node={node}
            depth={depth}
            isExpanded={expandedFolders.has(node.id)}
            isActive={activeFileId === node.id}
            onToggle={toggleFolder}
            onSelect={onFileSelect}
          />
          {node.type === "folder" &&
            node.children &&
            expandedFolders.has(node.id) && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
        </div>
      ))
    },
    [expandedFolders, activeFileId, toggleFolder, onFileSelect]
  )

  const countAIModified = useCallback((nodes: FileNode[]): number => {
    let count = 0
    for (const node of nodes) {
      if (node.type === "file" && node.state?.aiStatus && node.state.aiStatus !== "none") {
        count++
      }
      if (node.children) {
        count += countAIModified(node.children)
      }
    }
    return count
  }, [])

  const aiModifiedCount = countAIModified(files)

  return (
    <aside
      ref={sidebarRef}
      style={{ width: isCollapsed ? 40 : width }}
      className={cn(
        "relative flex h-full flex-shrink-0 flex-col border-r border-border bg-sidebar",
        !isResizing && "transition-[width] duration-200"
      )}
    >
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b border-border px-2">
        {!isCollapsed ? (
          <>
            <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Explorer
            </span>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onNewFile}
              >
                <FilePlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onNewFolder}
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onRefresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 mx-auto text-muted-foreground hover:text-foreground"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Project */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate text-xs font-medium text-foreground">{projectName}</span>
              {aiModifiedCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded bg-primary/15 px-1 text-[10px] font-medium text-primary">
                  {aiModifiedCount}
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-border px-2 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-full justify-start gap-2 px-2 text-[11px] text-muted-foreground"
            >
              <Search className="h-3 w-3" />
              Search...
            </Button>
          </div>

          {/* Files */}
          <ScrollArea className="flex-1">
            <div className="py-1">{renderTree(files)}</div>
          </ScrollArea>
        </>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center gap-1 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsCollapsed(false)}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Resize handle */}
      {!isCollapsed && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors",
            "hover:bg-primary/30",
            isResizing && "bg-primary/50"
          )}
        />
      )}
    </aside>
  )
})
