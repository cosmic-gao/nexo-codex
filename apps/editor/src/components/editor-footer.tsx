import { useState, useRef, useEffect } from "react"
import { GitBranch as GitBranchIcon, Circle, ChevronDown, Check, Plus, RefreshCw } from "lucide-react"
import { cn } from "@nexo/ui"

export interface GitBranch {
  name: string
  isRemote?: boolean
  isCurrent?: boolean
  lastCommit?: string
}

interface EditorFooterProps {
  language: string
  cursorPosition?: { line: number; column: number }
  branchName?: string
  branches?: GitBranch[]
  onBranchChange?: (branchName: string) => void
  onCreateBranch?: (branchName: string) => void
  onRefreshBranches?: () => void
  isLoadingBranches?: boolean
}

export function EditorFooter({ 
  language, 
  cursorPosition,
  branchName = "main",
  branches = [],
  onBranchChange,
  onCreateBranch,
  onRefreshBranches,
  isLoadingBranches = false,
}: EditorFooterProps) {
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false)
  const [isCreatingBranch, setIsCreatingBranch] = useState(false)
  const [newBranchName, setNewBranchName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsBranchMenuOpen(false)
        setIsCreatingBranch(false)
        setNewBranchName("")
        setSearchQuery("")
      }
    }

    if (isBranchMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isBranchMenuOpen])

  // Focus input when creating branch
  useEffect(() => {
    if (isCreatingBranch && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreatingBranch])

  const handleBranchSelect = (name: string) => {
    onBranchChange?.(name)
    setIsBranchMenuOpen(false)
    setSearchQuery("")
  }

  const handleCreateBranch = () => {
    if (newBranchName.trim()) {
      onCreateBranch?.(newBranchName.trim())
      setNewBranchName("")
      setIsCreatingBranch(false)
      setIsBranchMenuOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateBranch()
    } else if (e.key === "Escape") {
      setIsCreatingBranch(false)
      setNewBranchName("")
    }
  }

  // Filter branches based on search
  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Separate local and remote branches
  const localBranches = filteredBranches.filter((b) => !b.isRemote)
  const remoteBranches = filteredBranches.filter((b) => b.isRemote)

  return (
    <footer className="flex h-6 items-center justify-between border-t border-border bg-card px-3 text-[11px] text-muted-foreground">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Circle className="h-2 w-2 fill-success text-success" />
          <span>Ready</span>
        </div>

        {/* Git Branch Selector */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
            className={cn(
              "flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors",
              "hover:bg-muted hover:text-foreground",
              isBranchMenuOpen && "bg-muted text-foreground"
            )}
          >
            <GitBranchIcon className="h-3 w-3" />
            <span className="max-w-[120px] truncate">{branchName}</span>
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              isBranchMenuOpen && "rotate-180"
            )} />
          </button>

          {/* Branch Menu Dropdown */}
          {isBranchMenuOpen && (
            <div 
              className="absolute bottom-full left-0 mb-1 w-64 rounded-lg border border-border bg-popover shadow-lg"
              style={{ zIndex: 100 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-xs font-medium text-foreground">Switch Branch</span>
                <div className="flex items-center gap-1">
                  {onRefreshBranches && (
                    <button
                      onClick={onRefreshBranches}
                      className="rounded p-1 hover:bg-muted"
                      title="Refresh branches"
                    >
                      <RefreshCw className={cn(
                        "h-3 w-3",
                        isLoadingBranches && "animate-spin"
                      )} />
                    </button>
                  )}
                  {onCreateBranch && (
                    <button
                      onClick={() => setIsCreatingBranch(true)}
                      className="rounded p-1 hover:bg-muted"
                      title="Create new branch"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Create Branch Input */}
              {isCreatingBranch && (
                <div className="border-b border-border p-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="New branch name..."
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  <div className="mt-1.5 flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setIsCreatingBranch(false)
                        setNewBranchName("")
                      }}
                      className="rounded px-2 py-0.5 text-xs hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateBranch}
                      disabled={!newBranchName.trim()}
                      className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      Create
                    </button>
                  </div>
                </div>
              )}

              {/* Search */}
              {branches.length > 5 && (
                <div className="border-b border-border p-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search branches..."
                    className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {/* Branch List */}
              <div className="max-h-48 overflow-y-auto py-1">
                {/* Local Branches */}
                {localBranches.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium uppercase text-muted-foreground">
                      Local
                    </div>
                    {localBranches.map((branch) => (
                      <button
                        key={branch.name}
                        onClick={() => handleBranchSelect(branch.name)}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted",
                          branch.isCurrent && "bg-muted/50"
                        )}
                      >
                        <GitBranchIcon className="h-3 w-3 shrink-0" />
                        <span className="flex-1 truncate">{branch.name}</span>
                        {branch.isCurrent && (
                          <Check className="h-3 w-3 shrink-0 text-success" />
                        )}
                      </button>
                    ))}
                  </>
                )}

                {/* Remote Branches */}
                {remoteBranches.length > 0 && (
                  <>
                    <div className="mt-1 px-3 py-1 text-[10px] font-medium uppercase text-muted-foreground">
                      Remote
                    </div>
                    {remoteBranches.map((branch) => (
                      <button
                        key={branch.name}
                        onClick={() => handleBranchSelect(branch.name)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <GitBranchIcon className="h-3 w-3 shrink-0" />
                        <span className="flex-1 truncate">{branch.name}</span>
                      </button>
                    ))}
                  </>
                )}

                {/* Empty State */}
                {filteredBranches.length === 0 && (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    {searchQuery ? "No branches found" : "No branches available"}
                  </div>
                )}
              </div>
            </div>
          )}
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
