/**
 * Types for code diff and AI modification review
 */

/**
 * A single change hunk in a diff
 */
export interface DiffHunk {
  oldStart: number      // Starting line in original
  oldLines: number      // Number of lines in original
  newStart: number      // Starting line in modified
  newLines: number      // Number of lines in modified
  lines: DiffLine[]     // Individual line changes
}

/**
 * A single line in a diff
 */
export interface DiffLine {
  type: "add" | "remove" | "context"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

/**
 * Complete diff between two versions of a file
 */
export interface FileDiff {
  filePath: string
  fileName: string
  language: string
  originalContent: string
  modifiedContent: string
  hunks: DiffHunk[]
  additions: number     // Total lines added
  deletions: number     // Total lines removed
}

/**
 * AI modification with explanation
 */
export interface AIModification {
  id: string
  filePath: string
  fileName: string
  language: string
  originalContent: string
  modifiedContent: string
  
  // AI explanation
  title: string           // Brief title of the change
  description: string     // Detailed explanation
  reason: string          // Why this change was made
  
  // Categorization
  category: AIModificationCategory
  severity: "info" | "warning" | "critical"
  
  // Review state
  status: AIModificationStatus
  reviewedAt?: Date
  reviewNote?: string
  
  // Metadata
  createdAt: Date
  confidence: number      // 0-1 confidence score
}

export type AIModificationCategory =
  | "bug-fix"
  | "refactor"
  | "optimization"
  | "security"
  | "style"
  | "documentation"
  | "feature"
  | "test"
  | "dependency"

export type AIModificationStatus =
  | "pending"       // Awaiting review
  | "accepted"      // User accepted
  | "rejected"      // User rejected
  | "partial"       // Partially accepted
  | "modified"      // User made further edits

/**
 * Batch of AI modifications (e.g., from a single AI task)
 */
export interface AIModificationBatch {
  id: string
  taskDescription: string   // What the AI was asked to do
  modifications: AIModification[]
  createdAt: Date
  status: "pending" | "reviewing" | "completed"
  acceptedCount: number
  rejectedCount: number
}

