import type { HistoryEntry, Patch } from "@nexo/types"
import { createReversePatch, applyPatch } from "./patch-utils"

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * History Manager for undo/redo functionality
 */
export class HistoryManager {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private maxHistorySize: number
  private currentGroupId: string | null = null

  constructor(options: { maxHistorySize?: number } = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100
  }

  /**
   * Start a group of related changes
   */
  startGroup(_description?: string): string {
    this.currentGroupId = generateId()
    return this.currentGroupId
  }

  /**
   * End the current group
   */
  endGroup(): void {
    this.currentGroupId = null
  }

  /**
   * Record a patch application
   */
  recordPatchApply(patch: Patch): void {
    this.addEntry({
      id: generateId(),
      type: "apply",
      patch,
      timestamp: new Date(),
      description: `Applied: ${patch.name}`,
      groupId: this.currentGroupId ?? undefined,
    })
  }

  /**
   * Record a patch revert
   */
  recordPatchRevert(patch: Patch): void {
    this.addEntry({
      id: generateId(),
      type: "revert",
      patch,
      timestamp: new Date(),
      description: `Reverted: ${patch.name}`,
      groupId: this.currentGroupId ?? undefined,
    })
  }

  /**
   * Record a direct edit (not patch-based)
   */
  recordEdit(
    filePath: string,
    oldContent: string,
    newContent: string,
    description?: string
  ): void {
    this.addEntry({
      id: generateId(),
      type: "edit",
      filePath,
      oldContent,
      newContent,
      timestamp: new Date(),
      description: description ?? `Edited ${filePath.split("/").pop()}`,
      groupId: this.currentGroupId ?? undefined,
    })
  }

  /**
   * Add an entry to the undo stack
   */
  private addEntry(entry: HistoryEntry): void {
    this.undoStack.push(entry)
    
    // Clear redo stack when new action is performed
    this.redoStack = []
    
    // Limit history size
    while (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /**
   * Get the next undo entry (without popping)
   */
  peekUndo(): HistoryEntry | null {
    if (this.undoStack.length === 0) return null
    return this.undoStack[this.undoStack.length - 1]
  }

  /**
   * Get the next redo entry (without popping)
   */
  peekRedo(): HistoryEntry | null {
    if (this.redoStack.length === 0) return null
    return this.redoStack[this.redoStack.length - 1]
  }

  /**
   * Perform undo
   * Returns the entries that were undone (may be multiple if grouped)
   */
  undo(
    getFileContent: (path: string) => string | null,
    setFileContent: (path: string, content: string) => void
  ): HistoryEntry[] {
    if (!this.canUndo()) return []

    const undoneEntries: HistoryEntry[] = []
    const firstEntry = this.undoStack.pop()!
    undoneEntries.push(firstEntry)

    // If this entry has a group, undo all entries in the group
    if (firstEntry.groupId) {
      while (
        this.undoStack.length > 0 &&
        this.undoStack[this.undoStack.length - 1].groupId === firstEntry.groupId
      ) {
        undoneEntries.push(this.undoStack.pop()!)
      }
    }

    // Apply undo for each entry
    for (const entry of undoneEntries) {
      this.applyUndo(entry, getFileContent, setFileContent)
      this.redoStack.push(entry)
    }

    return undoneEntries
  }

  /**
   * Perform redo
   */
  redo(
    getFileContent: (path: string) => string | null,
    setFileContent: (path: string, content: string) => void
  ): HistoryEntry[] {
    if (!this.canRedo()) return []

    const redoneEntries: HistoryEntry[] = []
    const firstEntry = this.redoStack.pop()!
    redoneEntries.push(firstEntry)

    // If this entry has a group, redo all entries in the group
    if (firstEntry.groupId) {
      while (
        this.redoStack.length > 0 &&
        this.redoStack[this.redoStack.length - 1].groupId === firstEntry.groupId
      ) {
        redoneEntries.push(this.redoStack.pop()!)
      }
    }

    // Reverse to apply in correct order
    redoneEntries.reverse()

    // Apply redo for each entry
    for (const entry of redoneEntries) {
      this.applyRedo(entry, getFileContent, setFileContent)
      this.undoStack.push(entry)
    }

    return redoneEntries
  }

  /**
   * Apply an undo operation
   */
  private applyUndo(
    entry: HistoryEntry,
    getFileContent: (path: string) => string | null,
    setFileContent: (path: string, content: string) => void
  ): void {
    if (entry.type === "apply" && entry.patch) {
      // Create and apply reverse patch
      const reversePatch = createReversePatch(entry.patch)
      applyPatch(reversePatch, getFileContent, setFileContent)
    } else if (entry.type === "edit" && entry.filePath && entry.oldContent !== undefined) {
      // Direct content restoration
      setFileContent(entry.filePath, entry.oldContent)
    } else if (entry.type === "revert" && entry.patch) {
      // Re-apply the original patch
      applyPatch(entry.patch, getFileContent, setFileContent)
    }
  }

  /**
   * Apply a redo operation
   */
  private applyRedo(
    entry: HistoryEntry,
    getFileContent: (path: string) => string | null,
    setFileContent: (path: string, content: string) => void
  ): void {
    if (entry.type === "apply" && entry.patch) {
      // Re-apply the patch
      applyPatch(entry.patch, getFileContent, setFileContent)
    } else if (entry.type === "edit" && entry.filePath && entry.newContent !== undefined) {
      // Direct content application
      setFileContent(entry.filePath, entry.newContent)
    } else if (entry.type === "revert" && entry.patch) {
      // Apply reverse patch again
      const reversePatch = createReversePatch(entry.patch)
      applyPatch(reversePatch, getFileContent, setFileContent)
    }
  }

  /**
   * Get undo history (newest first)
   */
  getUndoHistory(): HistoryEntry[] {
    return [...this.undoStack].reverse()
  }

  /**
   * Get redo history (newest first)
   */
  getRedoHistory(): HistoryEntry[] {
    return [...this.redoStack].reverse()
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.currentGroupId = null
  }

  /**
   * Get history statistics
   */
  getStats() {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      maxSize: this.maxHistorySize,
    }
  }
}

