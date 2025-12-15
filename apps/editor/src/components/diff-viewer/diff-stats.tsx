import { Plus, Minus } from "lucide-react"
import { cn } from "@nexo/ui"

interface DiffStatsProps {
  additions: number
  deletions: number
  fileName?: string
  className?: string
}

export function DiffStats({ additions, deletions, fileName, className }: DiffStatsProps) {
  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      {fileName && (
        <span className="font-medium text-muted-foreground truncate max-w-[100px]">{fileName}</span>
      )}
      <div className="flex items-center gap-1.5 text-success">
        <Plus className="h-3 w-3" />
        <span className="font-mono">{additions}</span>
      </div>
      <div className="flex items-center gap-1.5 text-destructive">
        <Minus className="h-3 w-3" />
        <span className="font-mono">{deletions}</span>
      </div>
    </div>
  )
}

/**
 * Calculate diff stats from two strings
 */
export function calculateDiffStats(original: string, modified: string): {
  additions: number
  deletions: number
} {
  const originalLines = original.split("\n")
  const modifiedLines = modified.split("\n")
  
  const originalSet = new Set(originalLines)
  const modifiedSet = new Set(modifiedLines)
  
  let additions = 0
  let deletions = 0
  
  for (const line of modifiedLines) {
    if (!originalSet.has(line)) {
      additions++
    }
  }
  
  for (const line of originalLines) {
    if (!modifiedSet.has(line)) {
      deletions++
    }
  }
  
  return { additions, deletions }
}
