import { useState, useCallback, useMemo } from "react"
import type { AIModification, AIModificationStatus, AIModificationCategory, Patch, PatchResult, HistoryEntry } from "@nexo/types"
import { 
  generateLinePatches, 
  createPatch, 
  applyPatch, 
  createReversePatch,
  validatePatch,
  HistoryManager 
} from "@nexo/vfs"

/**
 * AI Provider configuration
 */
export interface AIProviderConfig {
  provider: "openai" | "anthropic" | "custom"
  apiKey: string
  baseUrl?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

/**
 * AI Review request options
 */
export interface AIReviewOptions {
  filePath: string
  fileName: string
  language: string
  content: string
  instruction?: string  // Custom instruction for the AI
  context?: string      // Additional context (e.g., related files)
  category?: AIModificationCategory
}

/**
 * AI Review result
 */
export interface AIReviewResult {
  success: boolean
  modification?: AIModification
  error?: string
}

/**
 * Default AI provider configuration
 */
const DEFAULT_AI_CONFIG: AIProviderConfig = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o",
  maxTokens: 4096,
  temperature: 0.2,
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `mod-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Parse AI response to extract code modifications
 */
function parseAIResponse(
  response: string,
  options: AIReviewOptions
): Partial<AIModification> | null {
  try {
    // Try to parse JSON response first
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1])
      return {
        title: parsed.title || "AI Suggestion",
        description: parsed.description || "",
        reason: parsed.reason || "",
        modifiedContent: parsed.modifiedContent || parsed.code || "",
        category: parsed.category || "refactor",
        severity: parsed.severity || "info",
        confidence: parsed.confidence || 0.8,
      }
    }

    // Try to extract code block
    const codeMatch = response.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/)
    if (codeMatch) {
      return {
        title: "AI Code Improvement",
        description: "AI suggested improvements for this file",
        reason: "Based on best practices and code analysis",
        modifiedContent: codeMatch[1],
        category: options.category || "refactor",
        severity: "info",
        confidence: 0.75,
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  config: AIProviderConfig,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const baseUrl = config.baseUrl || "https://api.openai.com/v1"
  
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.2,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  config: AIProviderConfig,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  const baseUrl = config.baseUrl || "https://api.anthropic.com/v1"
  
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-3-5-sonnet-20241022",
      max_tokens: config.maxTokens || 4096,
      system: systemPrompt,
      messages: [
        { role: "user", content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text || ""
}

/**
 * Call AI provider
 */
async function callAI(
  config: AIProviderConfig,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  switch (config.provider) {
    case "openai":
      return callOpenAI(config, prompt, systemPrompt)
    case "anthropic":
      return callAnthropic(config, prompt, systemPrompt)
    case "custom":
      // For custom providers, use OpenAI-compatible API
      return callOpenAI(config, prompt, systemPrompt)
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

/**
 * Build system prompt for code review
 */
function buildSystemPrompt(): string {
  return `You are an expert code reviewer. Analyze the provided code and suggest improvements.

Your response should be in JSON format within a markdown code block:

\`\`\`json
{
  "title": "Brief title of the change",
  "description": "Detailed description of what you changed",
  "reason": "Why this change improves the code",
  "modifiedContent": "The complete modified code",
  "category": "bug-fix|refactor|optimization|security|style|documentation|feature|test|dependency",
  "severity": "info|warning|critical",
  "confidence": 0.0-1.0
}
\`\`\`

Guidelines:
- Only suggest changes that improve code quality, performance, or security
- Keep the original functionality intact unless explicitly asked to change it
- Provide complete, working code in modifiedContent
- Be specific in your descriptions and reasons
- Set appropriate severity based on the importance of the change`
}

/**
 * Build user prompt for code review
 */
function buildUserPrompt(options: AIReviewOptions): string {
  let prompt = `Please review and improve the following ${options.language} code from file "${options.fileName}":\n\n`
  
  prompt += "```" + options.language + "\n"
  prompt += options.content
  prompt += "\n```\n"

  if (options.instruction) {
    prompt += `\nSpecific instruction: ${options.instruction}\n`
  }

  if (options.context) {
    prompt += `\nAdditional context:\n${options.context}\n`
  }

  return prompt
}

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

export interface UseAIReviewOptions {
  /** Initial AI provider configuration */
  aiConfig?: Partial<AIProviderConfig>
  /** Maximum history size for undo/redo */
  maxHistorySize?: number
}

export function useAIReview(options: UseAIReviewOptions = {}) {
  const [modifications, setModifications] = useState<AIModification[]>([])
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false)
  const [appliedPatches, setAppliedPatches] = useState<Patch[]>([])
  const [historyManager] = useState(() => new HistoryManager({ maxHistorySize: options.maxHistorySize ?? 50 }))
  
  // AI provider configuration
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(() => ({
    ...DEFAULT_AI_CONFIG,
    ...options.aiConfig,
  }))
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewingFiles, setReviewingFiles] = useState<Set<string>>(new Set())
  
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
    setError(null)
    
    // Initialize file contents with original content
    const contents: FileContentStore = {}
    for (const mod of samples) {
      contents[mod.filePath] = mod.originalContent
    }
    setFileContents(contents)
  }, [])

  // Update AI provider configuration
  const updateAIConfig = useCallback((newConfig: Partial<AIProviderConfig>) => {
    setAiConfig((prev) => ({ ...prev, ...newConfig }))
  }, [])

  // Check if AI is configured
  const isAIConfigured = useMemo(() => {
    return Boolean(aiConfig.apiKey && aiConfig.apiKey.length > 0)
  }, [aiConfig.apiKey])

  // Request AI review for a file
  const requestAIReview = useCallback(async (
    reviewOptions: AIReviewOptions
  ): Promise<AIReviewResult> => {
    if (!isAIConfigured) {
      const errorMsg = "AI provider not configured. Please set an API key."
      setError(errorMsg)
      return { success: false, error: errorMsg }
    }

    // Mark file as being reviewed
    setReviewingFiles((prev) => new Set(prev).add(reviewOptions.filePath))
    setIsLoading(true)
    setError(null)

    try {
      const systemPrompt = buildSystemPrompt()
      const userPrompt = buildUserPrompt(reviewOptions)

      const response = await callAI(aiConfig, userPrompt, systemPrompt)
      const parsed = parseAIResponse(response, reviewOptions)

      if (!parsed || !parsed.modifiedContent) {
        throw new Error("Failed to parse AI response")
      }

      // Check if the content actually changed
      if (parsed.modifiedContent.trim() === reviewOptions.content.trim()) {
        // No changes suggested
        return { success: true }
      }

      // Create the modification
      const modification: AIModification = {
        id: generateId(),
        filePath: reviewOptions.filePath,
        fileName: reviewOptions.fileName,
        language: reviewOptions.language,
        originalContent: reviewOptions.content,
        modifiedContent: parsed.modifiedContent,
        title: parsed.title || "AI Suggestion",
        description: parsed.description || "",
        reason: parsed.reason || "",
        category: parsed.category || reviewOptions.category || "refactor",
        severity: parsed.severity || "info",
        status: "pending",
        createdAt: new Date(),
        confidence: parsed.confidence || 0.8,
      }

      // Add to modifications list
      setModifications((prev) => [...prev, modification])
      
      // Store original content
      setFileContents((prev) => ({
        ...prev,
        [reviewOptions.filePath]: reviewOptions.content,
      }))

      // Open review panel
      setIsReviewPanelOpen(true)

      return { success: true, modification }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setIsLoading(false)
      setReviewingFiles((prev) => {
        const next = new Set(prev)
        next.delete(reviewOptions.filePath)
        return next
      })
    }
  }, [aiConfig, isAIConfigured])

  // Request AI review for multiple files
  const requestBatchReview = useCallback(async (
    files: AIReviewOptions[],
    instruction?: string
  ): Promise<AIReviewResult[]> => {
    setIsLoading(true)
    setError(null)

    const results: AIReviewResult[] = []

    for (const file of files) {
      const result = await requestAIReview({
        ...file,
        instruction: instruction || file.instruction,
      })
      results.push(result)
    }

    setIsLoading(false)
    return results
  }, [requestAIReview])

  // Add a modification manually
  const addModification = useCallback((
    modificationData: Omit<AIModification, "id" | "status" | "createdAt">
  ) => {
    const modification: AIModification = {
      ...modificationData,
      id: generateId(),
      status: "pending",
      createdAt: new Date(),
    }

    setModifications((prev) => [...prev, modification])
    
    // Store original content
    setFileContents((prev) => ({
      ...prev,
      [modificationData.filePath]: modificationData.originalContent,
    }))

    setIsReviewPanelOpen(true)
    return modification
  }, [])

  // Add multiple modifications
  const addModifications = useCallback((
    modificationsData: Array<Omit<AIModification, "id" | "status" | "createdAt">>
  ) => {
    const newModifications: AIModification[] = modificationsData.map((data) => ({
      ...data,
      id: generateId(),
      status: "pending" as const,
      createdAt: new Date(),
    }))

    setModifications((prev) => [...prev, ...newModifications])
    
    // Store original contents
    const contents: FileContentStore = {}
    for (const mod of newModifications) {
      contents[mod.filePath] = mod.originalContent
    }
    setFileContents((prev) => ({ ...prev, ...contents }))

    setIsReviewPanelOpen(true)
    return newModifications
  }, [])

  // Check if a file is currently being reviewed
  const isFileBeingReviewed = useCallback((filePath: string) => {
    return reviewingFiles.has(filePath)
  }, [reviewingFiles])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
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
    
    // Loading and error states
    isLoading,
    error,
    clearError,
    
    // AI Configuration
    aiConfig,
    updateAIConfig,
    isAIConfigured,
    
    // Panel control
    setIsReviewPanelOpen,
    
    // Load
    loadSampleModifications,
    
    // AI Review
    requestAIReview,
    requestBatchReview,
    isFileBeingReviewed,
    
    // Manual modifications
    addModification,
    addModifications,
    
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
