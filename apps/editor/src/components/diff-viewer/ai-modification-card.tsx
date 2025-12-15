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
import { Button } from "@nexo/ui"
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
  "bug-fix": <Bug style={{ width: 12, height: 12 }} />,
  "refactor": <Zap style={{ width: 12, height: 12 }} />,
  "optimization": <Zap style={{ width: 12, height: 12 }} />,
  "security": <Shield style={{ width: 12, height: 12 }} />,
  "style": <Paintbrush style={{ width: 12, height: 12 }} />,
  "documentation": <FileText style={{ width: 12, height: 12 }} />,
  "feature": <Plus style={{ width: 12, height: 12 }} />,
  "test": <TestTube style={{ width: 12, height: 12 }} />,
  "dependency": <Package style={{ width: 12, height: 12 }} />,
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

  const getCardStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      borderRadius: 8,
      border: "1px solid",
      transition: "all 0.2s",
      overflow: "hidden",
    }
    if (isPending) {
      return { ...base, borderColor: "#e5e7eb", backgroundColor: "#ffffff" }
    }
    if (isAccepted) {
      return { ...base, borderColor: "rgba(34, 197, 94, 0.3)", backgroundColor: "rgba(34, 197, 94, 0.05)" }
    }
    return { ...base, borderColor: "rgba(239, 68, 68, 0.3)", backgroundColor: "rgba(239, 68, 68, 0.05)" }
  }

  return (
    <div style={getCardStyle()}>
      {/* Header */}
      <div
        style={{ 
          display: "flex", 
          cursor: "pointer", 
          alignItems: "center", 
          gap: 8, 
          padding: 12,
        }}
        onClick={onToggleExpand}
      >
        <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#6b7280", flexShrink: 0 }}>
          {isExpanded 
            ? <ChevronDown style={{ width: 14, height: 14 }} /> 
            : <ChevronRight style={{ width: 14, height: 14 }} />
          }
        </button>

        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ 
              fontSize: 14, 
              fontWeight: 500, 
              color: "#1f2937", 
              overflow: "hidden", 
              textOverflow: "ellipsis", 
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}>
              {modification.title}
            </span>
            <span style={{ 
              flexShrink: 0,
              display: "inline-flex", 
              alignItems: "center", 
              gap: 4, 
              borderRadius: 4, 
              backgroundColor: "#f3f4f6", 
              padding: "2px 6px", 
              fontSize: 10, 
              fontWeight: 500, 
              color: "#6b7280",
            }}>
              {categoryIcons[modification.category]}
              {categoryLabels[modification.category]}
            </span>
          </div>
          <p style={{ 
            fontSize: 12, 
            color: "#6b7280", 
            overflow: "hidden", 
            textOverflow: "ellipsis", 
            whiteSpace: "nowrap", 
            marginTop: 2,
            margin: 0,
          }}>
            {modification.fileName}
          </p>
        </div>

        {/* Status badge or actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
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
              <span style={{ fontSize: 12, fontWeight: 500, color: "#22c55e" }}>Applied</span>
              {onRevert && (
                <Button variant="ghost" size="icon" onClick={onRevert} className="h-7 w-7">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 500, color: "#ef4444" }}>Rejected</span>
          )}
        </div>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div style={{ borderTop: "1px solid #e5e7eb", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: 14, color: "#1f2937", margin: 0, wordBreak: "break-word", lineHeight: 1.5 }}>
            {modification.description}
          </p>
          
          {modification.reason && (
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0, wordBreak: "break-word", lineHeight: 1.4 }}>
              {modification.reason}
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <DiffStats additions={stats.additions} deletions={stats.deletions} fileName="" />
            
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
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
