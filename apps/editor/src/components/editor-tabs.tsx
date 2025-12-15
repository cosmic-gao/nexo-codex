import { memo } from "react"
import { X, Sparkles, Loader2 } from "lucide-react"
import { cn, ScrollArea } from "@nexo/ui"
import type { EditorTab, AIStatus } from "@nexo/types"

interface EditorTabsProps {
  tabs: EditorTab[]
  activeTabId: string | null
  onTabSelect: (tabId: string) => void
  onTabClose: (tabId: string) => void
}

function AIIndicator({ status }: { status: AIStatus }) {
  if (status === "modifying") {
    return <Loader2 className="h-3 w-3 animate-spin text-primary" />
  }
  if (status === "modified" || status === "pending" || status === "reviewing") {
    return <Sparkles className="h-3 w-3 text-primary" />
  }
  return null
}

export const EditorTabs = memo(function EditorTabs({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
}: EditorTabsProps) {
  if (tabs.length === 0) return null

  return (
    <div className="flex h-8 items-stretch border-b border-border bg-card">
      <ScrollArea className="flex-1" orientation="horizontal">
        <div className="flex h-full">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId
            
            return (
              <div
                key={tab.id}
                className={cn(
                  "group relative flex min-w-[100px] max-w-[160px] cursor-pointer items-center gap-2 border-r border-border px-3 text-xs transition-colors",
                  isActive 
                    ? "bg-background text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onTabSelect(tab.id)}
              >
                {isActive && (
                  <div className="absolute inset-x-0 top-0 h-px bg-primary" />
                )}

                <span className={cn("flex-1 truncate", tab.isDirty && "italic")}>
                  {tab.fileName}
                </span>

                <div className="flex items-center gap-1">
                  <AIIndicator status={tab.aiStatus} />
                  
                  {tab.isDirty && tab.aiStatus === "none" ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
                  ) : (
                    <button
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded opacity-0 hover:bg-accent",
                        "group-hover:opacity-100",
                        isActive && "opacity-50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTabClose(tab.id)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
})
