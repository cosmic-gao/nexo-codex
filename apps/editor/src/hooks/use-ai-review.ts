import { useState, useCallback, useMemo } from "react"
import type { AIModification, AIModificationStatus, Patch, PatchResult, HistoryEntry } from "@nexo/types"
import { 
  generateLinePatches, 
  createPatch, 
  applyPatch, 
  createReversePatch,
  validatePatch,
  HistoryManager 
} from "@nexo/vfs"

/**
 * Sample AI modifications for demo
 */
const createSampleModifications = (): AIModification[] => [
  {
    id: "mod-1",
    filePath: "/src/utils/helpers.ts",
    fileName: "helpers.ts",
    language: "typescript",
    originalContent: `export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}`,
    modifiedContent: `export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  return date.toLocaleDateString('en-US', options)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return \`\${days} day\${days > 1 ? 's' : ''} ago\`
  if (hours > 0) return \`\${hours} hour\${hours > 1 ? 's' : ''} ago\`
  if (minutes > 0) return \`\${minutes} minute\${minutes > 1 ? 's' : ''} ago\`
  return 'just now'
}

export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}`,
    title: "Enhanced date formatting with locale support",
    description: "Replaced basic ISO date formatting with Intl.DateTimeFormat for better localization. Added a new formatRelativeTime function for human-readable relative dates.",
    reason: "The original formatDate function returned dates in ISO format (2024-01-15) which is not user-friendly. Using Intl.DateTimeFormat provides localized, readable dates. The new formatRelativeTime function is commonly needed for UI timestamps.",
    category: "feature",
    severity: "info",
    status: "pending",
    createdAt: new Date(),
    confidence: 0.92,
  },
  {
    id: "mod-2",
    filePath: "/src/app.ts",
    fileName: "app.ts",
    language: "typescript",
    originalContent: `export class App {
  private name: string

  constructor() {
    this.name = 'Nexo Codex'
  }

  start() {
    console.log(\`Starting \${this.name}...\`)
  }
}`,
    modifiedContent: `export class App {
  private readonly name: string
  private isRunning: boolean = false

  constructor(name: string = 'Nexo Codex') {
    this.name = name
  }

  start(): void {
    if (this.isRunning) {
      console.warn(\`\${this.name} is already running\`)
      return
    }
    this.isRunning = true
    console.log(\`Starting \${this.name}...\`)
  }

  stop(): void {
    if (!this.isRunning) {
      console.warn(\`\${this.name} is not running\`)
      return
    }
    this.isRunning = false
    console.log(\`Stopping \${this.name}...\`)
  }

  get running(): boolean {
    return this.isRunning
  }
}`,
    title: "Added state management and stop functionality",
    description: "Added isRunning state to track app lifecycle, added stop() method, made name configurable via constructor, added readonly modifier and explicit return types.",
    reason: "The original App class lacked proper lifecycle management. Without tracking running state, multiple start() calls could cause issues. The stop() method is essential for proper cleanup.",
    category: "refactor",
    severity: "warning",
    status: "pending",
    createdAt: new Date(),
    confidence: 0.85,
  },
  {
    id: "mod-3",
    filePath: "/src/api/client.ts",
    fileName: "client.ts",
    language: "typescript",
    originalContent: `async function fetchData(url: string) {
  const response = await fetch(url)
  return response.json()
}`,
    modifiedContent: `interface FetchOptions {
  timeout?: number
  retries?: number
}

async function fetchData<T>(
  url: string, 
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 5000, retries = 3 } = options
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { 
        signal: controller.signal 
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`)
      }
      
      return response.json() as Promise<T>
    } catch (error) {
      lastError = error as Error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(\`Request timeout after \${timeout}ms\`)
      }
      // Wait before retry
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }
  
  throw lastError ?? new Error('Failed to fetch')
}`,
    title: "Added error handling, timeout, and retry logic",
    description: "Enhanced fetchData with TypeScript generics, request timeout using AbortController, automatic retry with exponential backoff, and proper error handling.",
    reason: "The original function had no error handling, no timeout protection, and could hang indefinitely. Network requests should always have timeouts and retry logic for resilience.",
    category: "security",
    severity: "critical",
    status: "pending",
    createdAt: new Date(),
    confidence: 0.95,
  },
]

interface FileContentStore {
  [path: string]: string
}

export function useAIReview() {
  const [modifications, setModifications] = useState<AIModification[]>([])
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false)
  const [appliedPatches, setAppliedPatches] = useState<Patch[]>([])
  const [historyManager] = useState(() => new HistoryManager({ maxHistorySize: 50 }))
  
  // Simulated file content store (in real app, this would come from VFS)
  const [fileContents, setFileContents] = useState<FileContentStore>({})

  // Convert AI modification to patch
  const modificationToPatch = useCallback((mod: AIModification): Patch => {
    const operations = generateLinePatches(
      mod.filePath,
      mod.originalContent,
      mod.modifiedContent,
      "ai"
    )
    
    return createPatch(
      mod.title,
      mod.description,
      operations,
      {
        source: "ai",
        aiModificationId: mod.id,
        confidence: mod.confidence,
      }
    )
  }, [])

  // Get file content (for patch validation/application)
  const getFileContent = useCallback((path: string): string | null => {
    // First check our store
    if (fileContents[path] !== undefined) {
      return fileContents[path]
    }
    
    // For demo, return the original content from the modification
    const mod = modifications.find((m) => m.filePath === path)
    if (mod) {
      return mod.originalContent
    }
    
    return null
  }, [fileContents, modifications])

  // Set file content
  const setFileContent = useCallback((path: string, content: string) => {
    setFileContents((prev) => ({ ...prev, [path]: content }))
  }, [])

  // Load sample modifications for demo
  const loadSampleModifications = useCallback(() => {
    const samples = createSampleModifications()
    setModifications(samples)
    setIsReviewPanelOpen(true)
    
    // Initialize file contents with original content
    const contents: FileContentStore = {}
    for (const mod of samples) {
      contents[mod.filePath] = mod.originalContent
    }
    setFileContents(contents)
  }, [])

  // Validate a modification before applying
  const validateModification = useCallback((id: string) => {
    const mod = modifications.find((m) => m.id === id)
    if (!mod) return null
    
    const patch = modificationToPatch(mod)
    return validatePatch(patch, getFileContent)
  }, [modifications, modificationToPatch, getFileContent])

  // Accept and apply a modification using patch
  const acceptModification = useCallback((id: string): PatchResult | null => {
    const mod = modifications.find((m) => m.id === id)
    if (!mod || mod.status !== "pending") return null
    
    // Create patch from modification
    const patch = modificationToPatch(mod)
    
    // Validate first
    const validation = validatePatch(patch, getFileContent)
    if (!validation.isValid && !validation.canApply) {
      console.error("Patch validation failed:", validation.conflicts)
      return {
        success: false,
        patch,
        affectedFiles: [],
        errors: validation.conflicts.map((c) => ({
          operationId: c.operationId,
          type: "conflict" as const,
          message: c.description,
        })),
      }
    }
    
    // Apply the patch
    const result = applyPatch(patch, getFileContent, setFileContent)
    
    if (result.success) {
      // Record in history for undo
      historyManager.recordPatchApply(patch)
      
      // Update modification status
      setModifications((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: "accepted" as AIModificationStatus, reviewedAt: new Date() }
            : m
        )
      )
      
      // Store applied patch
      setAppliedPatches((prev) => [...prev, patch])
    }
    
    return result
  }, [modifications, modificationToPatch, getFileContent, setFileContent, historyManager])

  // Reject a modification
  const rejectModification = useCallback((id: string) => {
    setModifications((prev) =>
      prev.map((mod) =>
        mod.id === id
          ? { ...mod, status: "rejected" as AIModificationStatus, reviewedAt: new Date() }
          : mod
      )
    )
  }, [])

  // Revert an accepted modification
  const revertModification = useCallback((id: string): boolean => {
    const mod = modifications.find((m) => m.id === id)
    if (!mod || mod.status !== "accepted") return false
    
    // Find the applied patch
    const appliedPatch = appliedPatches.find((p) => p.aiModificationId === id)
    if (!appliedPatch) return false
    
    // Create reverse patch
    const reversePatch = createReversePatch(appliedPatch)
    
    // Apply the reverse patch
    const result = applyPatch(reversePatch, getFileContent, setFileContent)
    
    if (result.success) {
      // Record in history
      historyManager.recordPatchRevert(appliedPatch)
      
      // Update modification status back to pending
      setModifications((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: "pending" as AIModificationStatus, reviewedAt: undefined }
            : m
        )
      )
      
      // Remove from applied patches
      setAppliedPatches((prev) => prev.filter((p) => p.aiModificationId !== id))
      
      return true
    }
    
    return false
  }, [modifications, appliedPatches, getFileContent, setFileContent, historyManager])

  // Accept all pending modifications
  const acceptAll = useCallback(() => {
    const pending = modifications.filter((m) => m.status === "pending")
    
    // Start a group for undo
    historyManager.startGroup("Accept all AI modifications")
    
    for (const mod of pending) {
      acceptModification(mod.id)
    }
    
    historyManager.endGroup()
  }, [modifications, acceptModification, historyManager])

  // Reject all pending modifications
  const rejectAll = useCallback(() => {
    setModifications((prev) =>
      prev.map((mod) =>
        mod.status === "pending"
          ? { ...mod, status: "rejected" as AIModificationStatus, reviewedAt: new Date() }
          : mod
      )
    )
  }, [])

  // Undo last action
  const undo = useCallback((): HistoryEntry[] => {
    return historyManager.undo(getFileContent, setFileContent)
  }, [historyManager, getFileContent, setFileContent])

  // Redo last undone action
  const redo = useCallback((): HistoryEntry[] => {
    return historyManager.redo(getFileContent, setFileContent)
  }, [historyManager, getFileContent, setFileContent])

  // Clear all modifications
  const clearModifications = useCallback(() => {
    setModifications([])
    setAppliedPatches([])
    setFileContents({})
    historyManager.clear()
    setIsReviewPanelOpen(false)
  }, [historyManager])

  // Get current file content (after patches)
  const getCurrentContent = useCallback((path: string): string | null => {
    return getFileContent(path)
  }, [getFileContent])

  // Get pending count
  const pendingCount = modifications.filter((m) => m.status === "pending").length
  
  // Get history stats
  const historyStats = useMemo(() => historyManager.getStats(), [historyManager])

  return {
    // State
    modifications,
    isReviewPanelOpen,
    pendingCount,
    appliedPatches,
    historyStats,
    
    // Panel control
    setIsReviewPanelOpen,
    
    // Load
    loadSampleModifications,
    
    // Validation
    validateModification,
    
    // Actions
    acceptModification,
    rejectModification,
    revertModification,
    acceptAll,
    rejectAll,
    clearModifications,
    
    // History
    undo,
    redo,
    canUndo: historyManager.canUndo(),
    canRedo: historyManager.canRedo(),
    
    // Content access
    getCurrentContent,
  }
}
