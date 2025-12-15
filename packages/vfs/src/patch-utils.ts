import type {
  Patch,
  PatchOperation,
  PatchResult,
  PatchError,
  PatchValidation,
  PatchConflict,
  PatchResolution,
} from "@nexo/types"

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Create a patch operation from a content diff
 */
export function createReplaceOperation(
  filePath: string,
  oldContent: string,
  newContent: string,
  options: {
    startLine?: number
    endLine?: number
    description?: string
    source?: "user" | "ai" | "system"
  } = {}
): PatchOperation {
  return {
    id: generateId(),
    type: "replace",
    filePath,
    startLine: options.startLine,
    endLine: options.endLine,
    oldContent,
    newContent,
    description: options.description,
    source: options.source ?? "system",
    createdAt: new Date(),
  }
}

/**
 * Create a patch from multiple operations
 */
export function createPatch(
  name: string,
  description: string,
  operations: PatchOperation[],
  options: {
    source?: "user" | "ai" | "system"
    aiModificationId?: string
    confidence?: number
  } = {}
): Patch {
  return {
    id: generateId(),
    name,
    description,
    operations,
    source: options.source ?? "system",
    createdAt: new Date(),
    status: "pending",
    aiModificationId: options.aiModificationId,
    confidence: options.confidence,
  }
}

/**
 * Generate line-based patch operations from two content strings
 */
export function generateLinePatches(
  filePath: string,
  originalContent: string,
  modifiedContent: string,
  source: "user" | "ai" | "system" = "system"
): PatchOperation[] {
  const originalLines = originalContent.split("\n")
  const modifiedLines = modifiedContent.split("\n")
  
  const operations: PatchOperation[] = []
  
  // Use a simple diff algorithm (can be replaced with more sophisticated one)
  const diff = computeLineDiff(originalLines, modifiedLines)
  
  for (const change of diff) {
    if (change.type === "delete") {
      operations.push({
        id: generateId(),
        type: "delete",
        filePath,
        startLine: change.oldStart,
        endLine: change.oldEnd,
        oldContent: originalLines.slice(change.oldStart - 1, change.oldEnd).join("\n"),
        newContent: "",
        source,
        createdAt: new Date(),
      })
    } else if (change.type === "insert") {
      operations.push({
        id: generateId(),
        type: "insert",
        filePath,
        startLine: change.newStart,
        oldContent: "",
        newContent: modifiedLines.slice(change.newStart - 1, change.newEnd).join("\n"),
        source,
        createdAt: new Date(),
      })
    } else if (change.type === "replace") {
      operations.push({
        id: generateId(),
        type: "replace",
        filePath,
        startLine: change.oldStart,
        endLine: change.oldEnd,
        oldContent: originalLines.slice(change.oldStart - 1, change.oldEnd).join("\n"),
        newContent: modifiedLines.slice(change.newStart - 1, change.newEnd).join("\n"),
        source,
        createdAt: new Date(),
      })
    }
  }
  
  return operations
}

/**
 * Simple line diff computation
 */
interface LineDiffChange {
  type: "insert" | "delete" | "replace"
  oldStart: number
  oldEnd: number
  newStart: number
  newEnd: number
}

function computeLineDiff(original: string[], modified: string[]): LineDiffChange[] {
  const changes: LineDiffChange[] = []
  
  // LCS-based diff algorithm
  const lcs = computeLCS(original, modified)
  
  let i = 0
  let j = 0
  let lcsIdx = 0
  
  while (i < original.length || j < modified.length) {
    if (lcsIdx < lcs.length && i < original.length && original[i] === lcs[lcsIdx]) {
      // Common line
      if (j < modified.length && modified[j] === lcs[lcsIdx]) {
        i++
        j++
        lcsIdx++
      } else {
        // Insert in modified
        const insertStart = j + 1
        while (j < modified.length && (lcsIdx >= lcs.length || modified[j] !== lcs[lcsIdx])) {
          j++
        }
        changes.push({
          type: "insert",
          oldStart: i + 1,
          oldEnd: i,
          newStart: insertStart,
          newEnd: j,
        })
      }
    } else if (lcsIdx < lcs.length && j < modified.length && modified[j] === lcs[lcsIdx]) {
      // Delete from original
      const deleteStart = i + 1
      while (i < original.length && (lcsIdx >= lcs.length || original[i] !== lcs[lcsIdx])) {
        i++
      }
      changes.push({
        type: "delete",
        oldStart: deleteStart,
        oldEnd: i,
        newStart: j + 1,
        newEnd: j,
      })
    } else {
      // Both differ - this is a replace
      const oldStart = i + 1
      const newStart = j + 1
      
      while (i < original.length && (lcsIdx >= lcs.length || original[i] !== lcs[lcsIdx])) {
        i++
      }
      while (j < modified.length && (lcsIdx >= lcs.length || modified[j] !== lcs[lcsIdx])) {
        j++
      }
      
      if (i > oldStart - 1 || j > newStart - 1) {
        changes.push({
          type: i > oldStart - 1 && j > newStart - 1 ? "replace" : i > oldStart - 1 ? "delete" : "insert",
          oldStart,
          oldEnd: i,
          newStart,
          newEnd: j,
        })
      }
    }
  }
  
  return mergeAdjacentChanges(changes)
}

/**
 * Compute Longest Common Subsequence
 */
function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  
  // DP table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  // Backtrack to find LCS
  const lcs: string[] = []
  let i = m
  let j = n
  
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  
  return lcs
}

/**
 * Merge adjacent changes of the same type
 */
function mergeAdjacentChanges(changes: LineDiffChange[]): LineDiffChange[] {
  if (changes.length === 0) return changes
  
  const merged: LineDiffChange[] = [changes[0]]
  
  for (let i = 1; i < changes.length; i++) {
    const prev = merged[merged.length - 1]
    const curr = changes[i]
    
    // Merge if adjacent and compatible
    if (prev.type === curr.type && 
        prev.oldEnd === curr.oldStart - 1 && 
        prev.newEnd === curr.newStart - 1) {
      prev.oldEnd = curr.oldEnd
      prev.newEnd = curr.newEnd
    } else {
      merged.push(curr)
    }
  }
  
  return merged
}

/**
 * Validate a patch against current file content
 */
export function validatePatch(
  patch: Patch,
  getFileContent: (path: string) => string | null
): PatchValidation {
  const conflicts: PatchConflict[] = []
  const warnings: string[] = []
  
  for (const op of patch.operations) {
    const currentContent = getFileContent(op.filePath)
    
    if (currentContent === null) {
      if (op.type !== "insert") {
        conflicts.push({
          operationId: op.id,
          filePath: op.filePath,
          type: "content-changed",
          description: `File not found: ${op.filePath}`,
          currentContent: "",
          expectedContent: op.oldContent,
          resolutions: [
            { id: "skip", type: "skip", description: "Skip this operation" },
          ],
        })
      }
      continue
    }
    
    const lines = currentContent.split("\n")
    
    // Check line range
    if (op.startLine !== undefined) {
      if (op.startLine < 1 || op.startLine > lines.length + 1) {
        conflicts.push({
          operationId: op.id,
          filePath: op.filePath,
          line: op.startLine,
          type: "line-deleted",
          description: `Line ${op.startLine} is out of range (file has ${lines.length} lines)`,
          currentContent: "",
          expectedContent: op.oldContent,
          resolutions: [
            { id: "skip", type: "skip", description: "Skip this operation" },
            { id: "force", type: "force-apply", description: "Append to end of file" },
          ],
        })
        continue
      }
      
      // Check content match for replace/delete operations
      if (op.type === "replace" || op.type === "delete") {
        const endLine = op.endLine ?? op.startLine
        const actualContent = lines.slice(op.startLine - 1, endLine).join("\n")
        
        if (actualContent !== op.oldContent) {
          // Content has changed since patch was created
          const resolutions: PatchResolution[] = [
            { id: "skip", type: "skip", description: "Skip this operation" },
            { id: "force", type: "force-apply", description: "Force apply (overwrite current)" },
          ]
          
          // Try to find the old content elsewhere in the file
          const oldLines = op.oldContent.split("\n")
          for (let i = 0; i < lines.length - oldLines.length + 1; i++) {
            const segment = lines.slice(i, i + oldLines.length).join("\n")
            if (segment === op.oldContent) {
              resolutions.push({
                id: `relocate-${i + 1}`,
                type: "merge",
                description: `Apply at line ${i + 1} (content found there)`,
              })
              break
            }
          }
          
          conflicts.push({
            operationId: op.id,
            filePath: op.filePath,
            line: op.startLine,
            type: "content-changed",
            description: `Content at line ${op.startLine} has changed`,
            currentContent: actualContent,
            expectedContent: op.oldContent,
            resolutions,
          })
        }
      }
    }
  }
  
  return {
    isValid: conflicts.length === 0,
    canApply: conflicts.every((c) => c.resolutions.length > 0),
    conflicts,
    warnings,
  }
}

/**
 * Apply a single patch operation to content
 */
export function applyOperation(
  content: string,
  operation: PatchOperation
): { success: boolean; content: string; error?: PatchError } {
  const lines = content.split("\n")
  
  try {
    switch (operation.type) {
      case "insert": {
        const insertAt = (operation.startLine ?? lines.length + 1) - 1
        const newLines = operation.newContent.split("\n")
        lines.splice(insertAt, 0, ...newLines)
        break
      }
      
      case "delete": {
        const start = (operation.startLine ?? 1) - 1
        const end = operation.endLine ?? operation.startLine ?? 1
        const deleteCount = end - start
        
        // Validate content
        const actualContent = lines.slice(start, end).join("\n")
        if (actualContent !== operation.oldContent) {
          return {
            success: false,
            content,
            error: {
              operationId: operation.id,
              type: "content-mismatch",
              message: `Content mismatch at line ${operation.startLine}`,
              expected: operation.oldContent,
              actual: actualContent,
            },
          }
        }
        
        lines.splice(start, deleteCount)
        break
      }
      
      case "replace": {
        const start = (operation.startLine ?? 1) - 1
        const end = operation.endLine ?? operation.startLine ?? 1
        const deleteCount = end - start
        
        // Validate content
        const actualContent = lines.slice(start, end).join("\n")
        if (actualContent !== operation.oldContent) {
          return {
            success: false,
            content,
            error: {
              operationId: operation.id,
              type: "content-mismatch",
              message: `Content mismatch at line ${operation.startLine}`,
              expected: operation.oldContent,
              actual: actualContent,
            },
          }
        }
        
        const newLines = operation.newContent.split("\n")
        lines.splice(start, deleteCount, ...newLines)
        break
      }
      
      case "move": {
        // Move is delete + insert
        // For now, treat as replace
        return applyOperation(content, { ...operation, type: "replace" })
      }
    }
    
    return { success: true, content: lines.join("\n") }
  } catch (err) {
    return {
      success: false,
      content,
      error: {
        operationId: operation.id,
        type: "conflict",
        message: (err as Error).message,
      },
    }
  }
}

/**
 * Apply a complete patch to a file system
 */
export function applyPatch(
  patch: Patch,
  getFileContent: (path: string) => string | null,
  setFileContent: (path: string, content: string) => void
): PatchResult {
  const errors: PatchError[] = []
  const affectedFiles = new Set<string>()
  const fileContents = new Map<string, string>()
  
  // Group operations by file
  const operationsByFile = new Map<string, PatchOperation[]>()
  for (const op of patch.operations) {
    if (!operationsByFile.has(op.filePath)) {
      operationsByFile.set(op.filePath, [])
    }
    operationsByFile.get(op.filePath)!.push(op)
  }
  
  // Apply operations file by file
  for (const [filePath, operations] of operationsByFile) {
    let content = getFileContent(filePath)
    
    if (content === null) {
      // File doesn't exist, check if we're creating it
      const hasInsertOnly = operations.every((op) => op.type === "insert")
      if (hasInsertOnly) {
        content = ""
      } else {
        for (const op of operations) {
          errors.push({
            operationId: op.id,
            type: "file-not-found",
            message: `File not found: ${filePath}`,
          })
        }
        continue
      }
    }
    
    // Sort operations by line number (descending) to avoid offset issues
    const sortedOps = [...operations].sort((a, b) => {
      const aLine = a.startLine ?? 0
      const bLine = b.startLine ?? 0
      return bLine - aLine
    })
    
    // Apply each operation
    for (const op of sortedOps) {
      const result = applyOperation(content, op)
      if (result.success) {
        content = result.content
      } else if (result.error) {
        errors.push(result.error)
      }
    }
    
    fileContents.set(filePath, content)
    affectedFiles.add(filePath)
  }
  
  // If no errors, apply all changes
  if (errors.length === 0) {
    for (const [filePath, content] of fileContents) {
      setFileContent(filePath, content)
    }
    
    patch.status = "applied"
    patch.appliedAt = new Date()
    
    return {
      success: true,
      patch,
      affectedFiles: [...affectedFiles],
    }
  }
  
  // Errors occurred
  patch.status = "failed"
  
  return {
    success: false,
    patch,
    affectedFiles: [],
    errors,
  }
}

/**
 * Create a reverse patch (for undo)
 */
export function createReversePatch(patch: Patch): Patch {
  const reverseOperations: PatchOperation[] = patch.operations.map((op) => ({
    ...op,
    id: generateId(),
    type: op.type === "insert" ? "delete" : op.type === "delete" ? "insert" : "replace",
    oldContent: op.newContent,
    newContent: op.oldContent,
    createdAt: new Date(),
  }))
  
  // Reverse the order for proper undo
  reverseOperations.reverse()
  
  return {
    id: generateId(),
    name: `Revert: ${patch.name}`,
    description: `Reverts patch: ${patch.description}`,
    operations: reverseOperations,
    source: "system",
    createdAt: new Date(),
    status: "pending",
  }
}

/**
 * Serialize patch to unified diff format
 */
export function patchToUnifiedDiff(patch: Patch): string {
  const lines: string[] = []
  
  // Group by file
  const byFile = new Map<string, PatchOperation[]>()
  for (const op of patch.operations) {
    if (!byFile.has(op.filePath)) {
      byFile.set(op.filePath, [])
    }
    byFile.get(op.filePath)!.push(op)
  }
  
  for (const [filePath, ops] of byFile) {
    lines.push(`--- a${filePath}`)
    lines.push(`+++ b${filePath}`)
    
    for (const op of ops) {
      const oldLines = op.oldContent.split("\n").filter((l) => l !== "")
      const newLines = op.newContent.split("\n").filter((l) => l !== "")
      
      const startLine = op.startLine ?? 1
      const oldCount = oldLines.length
      const newCount = newLines.length
      
      lines.push(`@@ -${startLine},${oldCount} +${startLine},${newCount} @@`)
      
      for (const line of oldLines) {
        lines.push(`-${line}`)
      }
      for (const line of newLines) {
        lines.push(`+${line}`)
      }
    }
  }
  
  return lines.join("\n")
}

