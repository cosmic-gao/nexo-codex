import { memo } from "react"
import { 
  Check, 
  X, 
  ChevronDown, 
  ChevronRight,
  Bug,
  Zap,
  Shield,
  Paintbrush,
  FileText,
  Plus,
  TestTube,
  Package,
  Eye,
  RotateCcw
} from "lucide-react"
import { Button, cn } from "@nexo/ui"
import type { AIModification, AIModificationCategory } from "@nexo/types"
import { DiffStats, calculateDiffStats } from "./diff-stats"

interface AIModificationCardProps {
  modification: AIModification
  isExpanded: boolean
  onToggleExpand: () => void
  onAccept: () => void
  onReject: () => void
  onRevert?: () => void
  onViewDiff: () => void
}

const categoryIcons: Record<AIModificationCategory, React.ReactNode> = {
  "bug-fix": <Bug className="h-3 w-3" />,
  "refactor": <Zap className="h-3 w-3" />,
  "optimization": <Zap className="h-3 w-3" />,
  "security": <Shield className="h-3 w-3" />,
  "style": <Paintbrush className="h-3 w-3" />,
  "documentation": <FileText className="h-3 w-3" />,
  "feature": <Plus className="h-3 w-3" />,
  "test": <TestTube className="h-3 w-3" />,
  "dependency": <Package className="h-3 w-3" />,
}

const categoryLabels: Record<AIModificationCategory, string> = {
  "bug-fix": "Bug Fix",
  "refactor": "Refactor",
  "optimization": "Optimize",
  "security": "Security",
  "style": "Style",
  "documentation": "Docs",
  "feature": "Feature",
  "test": "Test",
  "dependency": "Deps",
}

export const AIModificationCard = memo(function AIModificationCard({
  modification,
  isExpanded,
  onToggleExpand,
  onAccept,
  onReject,
  onRevert,
  onViewDiff,
}: AIModificationCardProps) {
  const stats = calculateDiffStats(modification.originalContent, modification.modifiedContent)
  const isPending = modification.status === "pending"
  const isAccepted = modification.status === "accepted"
  const isRejected = modification.status === "rejected"

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        isPending && "border-border bg-card",
        isAccepted && "border-success/30 bg-success/5",
        isRejected && "border-destructive/30 bg-destructive/5"
      )}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 p-3"
        onClick={onToggleExpand}
      >
        <button className="text-muted-foreground shrink-0">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {modification.title}
            </span>
            <span className="shrink-0 inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {categoryIcons[modification.category]}
              {categoryLabels[modification.category]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {modification.fileName}
          </p>
        </div>

        {/* Status badge or actions */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isPending ? (
            <>
              <Button variant="ghost" size="icon" onClick={onReject} className="h-7 w-7 text-destructive">
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" onClick={onAccept} className="h-7 w-7">
                <Check className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : isAccepted ? (
            <>
              <span className="text-xs font-medium text-success">Applied</span>
              {onRevert && (
                <Button variant="ghost" size="icon" onClick={onRevert} className="h-7 w-7">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          ) : (
            <span className="text-xs font-medium text-destructive">Rejected</span>
          )}
        </div>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="border-t border-border px-3 py-3 space-y-3">
          <p className="text-sm text-foreground break-words">{modification.description}</p>
          
          {modification.reason && (
            <p className="text-xs text-muted-foreground break-words">{modification.reason}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <DiffStats additions={stats.additions} deletions={stats.deletions} fileName="" />
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {Math.round(modification.confidence * 100)}% confidence
              </span>
              <Button variant="outline" size="sm" onClick={onViewDiff} className="h-7 text-xs shrink-0">
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
