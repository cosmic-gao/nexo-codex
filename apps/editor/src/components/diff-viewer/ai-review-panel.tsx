import { useState, useCallback, memo } from "react"
import { 
  X, 
  CheckCheck, 
  XCircle,
  Sparkles,
  ChevronLeft,
  Undo2,
  Redo2,
  RotateCcw,
  AlertTriangle,
  Info
} from "lucide-react"
import { Button, cn, ScrollArea } from "@nexo/ui"
import type { AIModification, PatchValidation } from "@nexo/types"
import { DiffEditor } from "./diff-editor"
import { DiffStats, calculateDiffStats } from "./diff-stats"
import { AIModificationCard } from "./ai-modification-card"

interface AIReviewPanelProps {
  modifications: AIModification[]
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onRevert?: (id: string) => void
  onAcceptAll: () => void
  onRejectAll: () => void
  onUndo?: () => void
  onRedo?: () => void
  onValidate?: (id: string) => PatchValidation | null
  onClose: () => void
  canUndo?: boolean
  canRedo?: boolean
}

export const AIReviewPanel = memo(function AIReviewPanel({
  modifications,
  onAccept,
  onReject,
  onRevert,
  onAcceptAll,
  onRejectAll,
  onUndo,
  onRedo,
  onValidate,
  onClose,
  canUndo = false,
  canRedo = false,
}: AIReviewPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [viewingDiffId, setViewingDiffId] = useState<string | null>(null)
  const [validation, setValidation] = useState<PatchValidation | null>(null)

  const pendingCount = modifications.filter((m) => m.status === "pending").length
  const acceptedCount = modifications.filter((m) => m.status === "accepted").length
  const rejectedCount = modifications.filter((m) => m.status === "rejected").length

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleViewDiff = useCallback((id: string) => {
    setViewingDiffId(id)
    if (onValidate) {
      const result = onValidate(id)
      setValidation(result)
    }
  }, [onValidate])

  const handleAccept = useCallback((id: string) => {
    onAccept(id)
    setViewingDiffId(null)
    setValidation(null)
  }, [onAccept])

  const handleReject = useCallback((id: string) => {
    onReject(id)
    setViewingDiffId(null)
    setValidation(null)
  }, [onReject])

  const handleRevert = useCallback((id: string) => {
    onRevert?.(id)
  }, [onRevert])

  const viewingModification = viewingDiffId
    ? modifications.find((m) => m.id === viewingDiffId)
    : null

  // Diff view
  if (viewingModification) {
    const stats = calculateDiffStats(
      viewingModification.originalContent,
      viewingModification.modifiedContent
    )

    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setViewingDiffId(null)
                setValidation(null)
              }}
              className="h-7 w-7 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium truncate">{viewingModification.title}</span>
          </div>
          <div className="shrink-0">
            <DiffStats
              additions={stats.additions}
              deletions={stats.deletions}
              fileName={viewingModification.fileName}
            />
          </div>
        </div>

        {/* Validation warning */}
        {validation && !validation.isValid && (
          <div className="flex shrink-0 items-start gap-2 border-b border-warning/20 bg-warning/5 px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
            <div className="text-xs min-w-0">
              <p className="font-medium text-warning">Validation warning</p>
              {validation.conflicts.map((c, i) => (
                <p key={i} className="text-muted-foreground mt-0.5 break-words">{c.description}</p>
              ))}
            </div>
          </div>
        )}

        {/* Diff */}
        <div className="flex-1 min-h-0 overflow-hidden p-3">
          <DiffEditor
            originalContent={viewingModification.originalContent}
            modifiedContent={viewingModification.modifiedContent}
            language={viewingModification.language}
            readOnly
          />
        </div>

        {/* Actions */}
        {viewingModification.status === "pending" && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-3 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReject(viewingModification.id)}
              className="text-destructive"
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => handleAccept(viewingModification.id)}
              disabled={validation !== null && !validation.canApply}
            >
              Apply
            </Button>
          </div>
        )}

        {viewingModification.status === "accepted" && onRevert && (
          <div className="flex shrink-0 items-center justify-between border-t border-border px-3 py-2">
            <span className="text-xs text-success">Applied</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRevert(viewingModification.id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Revert
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Main panel
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-medium truncate">AI Review</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onUndo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-7 w-7"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {onRedo && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              className="h-7 w-7"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Pending</span>
          <span className={cn(
            "rounded-full px-1.5 py-0.5 font-medium",
            pendingCount > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {pendingCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Applied</span>
          <span className="rounded-full bg-success/10 px-1.5 py-0.5 font-medium text-success">
            {acceptedCount}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Rejected</span>
          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
            {rejectedCount}
          </span>
        </div>
      </div>

      {/* Bulk actions */}
      {pendingCount > 1 && (
        <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRejectAll}
            className="h-7 text-xs text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject All
          </Button>
          <Button size="sm" onClick={onAcceptAll} className="h-7 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            Apply All
          </Button>
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {modifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Info className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No modifications</p>
            </div>
          ) : (
            modifications.map((modification) => (
              <AIModificationCard
                key={modification.id}
                modification={modification}
                isExpanded={expandedIds.has(modification.id)}
                onToggleExpand={() => toggleExpand(modification.id)}
                onAccept={() => onAccept(modification.id)}
                onReject={() => onReject(modification.id)}
                onRevert={onRevert ? () => handleRevert(modification.id) : undefined}
                onViewDiff={() => handleViewDiff(modification.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
})
