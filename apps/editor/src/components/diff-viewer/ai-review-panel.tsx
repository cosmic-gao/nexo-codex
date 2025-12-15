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
import { Button, cn } from "@nexo/ui"
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", height: 44, flexShrink: 0, alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e5e7eb", padding: "0 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Sparkles style={{ width: 16, height: 16, flexShrink: 0, color: "#2d8c82" }} />
          <span style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>AI Review</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
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
      <div style={{ display: "flex", flexShrink: 0, flexWrap: "wrap", alignItems: "center", gap: 12, borderBottom: "1px solid #e5e7eb", padding: "8px 12px", fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#6b7280" }}>Pending</span>
          <span style={{ 
            borderRadius: 9999, 
            padding: "2px 6px", 
            fontWeight: 500,
            backgroundColor: pendingCount > 0 ? "rgba(45, 140, 130, 0.1)" : "#f3f4f6",
            color: pendingCount > 0 ? "#2d8c82" : "#6b7280",
          }}>
            {pendingCount}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#6b7280" }}>Applied</span>
          <span style={{ borderRadius: 9999, padding: "2px 6px", fontWeight: 500, backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>
            {acceptedCount}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#6b7280" }}>Rejected</span>
          <span style={{ borderRadius: 9999, padding: "2px 6px", fontWeight: 500, backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
            {rejectedCount}
          </span>
        </div>
      </div>

      {/* Bulk actions */}
      {pendingCount > 1 && (
        <div style={{ display: "flex", flexShrink: 0, alignItems: "center", justifyContent: "flex-end", gap: 8, borderBottom: "1px solid #e5e7eb", padding: "8px 12px" }}>
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
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {modifications.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", color: "#6b7280" }}>
              <Info style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.5 }} />
              <p style={{ fontSize: 14, margin: 0 }}>No modifications</p>
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
      </div>
    </div>
  )
})
