/**
 * Types for atomic patch operations
 */

/**
 * A single atomic patch operation
 */
export interface PatchOperation {
  id: string
  type: PatchOperationType
  
  // Location
  filePath: string
  
  // For line-based operations
  startLine?: number
  endLine?: number
  
  // For character-based operations
  startOffset?: number
  endOffset?: number
  
  // Content
  oldContent: string      // Content being replaced (for validation)
  newContent: string      // New content to insert
  
  // Metadata
  description?: string
  source: "user" | "ai" | "system"
  createdAt: Date
}

export type PatchOperationType =
  | "insert"      // Insert new content
  | "delete"      // Delete existing content
  | "replace"     // Replace content (delete + insert)
  | "move"        // Move content to different location

/**
 * A group of related patch operations (atomic unit)
 */
export interface Patch {
  id: string
  name: string
  description: string
  operations: PatchOperation[]
  
  // Metadata
  source: "user" | "ai" | "system"
  createdAt: Date
  
  // State
  status: PatchStatus
  appliedAt?: Date
  revertedAt?: Date
  
  // For AI patches
  aiModificationId?: string
  confidence?: number
}

export type PatchStatus =
  | "pending"     // Not yet applied
  | "applied"     // Successfully applied
  | "reverted"    // Applied then reverted
  | "failed"      // Failed to apply
  | "conflict"    // Conflicts with current content

/**
 * Result of applying a patch
 */
export interface PatchResult {
  success: boolean
  patch: Patch
  affectedFiles: string[]
  errors?: PatchError[]
  warnings?: string[]
}

/**
 * Patch application error
 */
export interface PatchError {
  operationId: string
  type: "content-mismatch" | "line-out-of-range" | "file-not-found" | "conflict"
  message: string
  expected?: string
  actual?: string
}

/**
 * History entry for undo/redo
 */
export interface HistoryEntry {
  id: string
  type: "apply" | "revert" | "edit"
  patch?: Patch
  
  // For direct edits (not patch-based)
  filePath?: string
  oldContent?: string
  newContent?: string
  
  // Metadata
  timestamp: Date
  description: string
  
  // For grouping related changes
  groupId?: string
}

/**
 * Patch validation result
 */
export interface PatchValidation {
  isValid: boolean
  canApply: boolean
  conflicts: PatchConflict[]
  warnings: string[]
}

/**
 * Conflict information when patch cannot be cleanly applied
 */
export interface PatchConflict {
  operationId: string
  filePath: string
  line?: number
  type: "content-changed" | "line-deleted" | "overlapping-change"
  description: string
  
  // The current content at conflict location
  currentContent: string
  
  // What the patch expected
  expectedContent: string
  
  // Possible resolutions
  resolutions: PatchResolution[]
}

/**
 * Possible resolution for a conflict
 */
export interface PatchResolution {
  id: string
  type: "force-apply" | "skip" | "merge" | "manual"
  description: string
  resultContent?: string
}

/**
 * Batch of patches (e.g., from a single AI task)
 */
export interface PatchBatch {
  id: string
  name: string
  description: string
  patches: Patch[]
  
  // Metadata
  source: "user" | "ai" | "system"
  createdAt: Date
  
  // Stats
  totalOperations: number
  appliedCount: number
  pendingCount: number
  failedCount: number
}

