import { useState, useCallback, useMemo } from "react"
import type { GitBranch } from "@/components/editor-footer"

/**
 * Git branch management hook options
 */
export interface UseGitBranchOptions {
  /** Initial branch name */
  initialBranch?: string
  /** Initial list of branches */
  initialBranches?: GitBranch[]
  /** Callback when branch changes */
  onBranchChange?: (branchName: string) => void
  /** Callback when new branch is created */
  onBranchCreate?: (branchName: string) => void
}

/**
 * Default demo branches for when no Git repo is loaded
 */
const createDefaultBranches = (currentBranch: string): GitBranch[] => [
  { name: "main", isCurrent: currentBranch === "main" },
  { name: "develop", isCurrent: currentBranch === "develop" },
  { name: "feature/ai-review", isCurrent: currentBranch === "feature/ai-review" },
  { name: "feature/editor-improvements", isCurrent: currentBranch === "feature/editor-improvements" },
  { name: "hotfix/bug-fix", isCurrent: currentBranch === "hotfix/bug-fix" },
  { name: "origin/main", isRemote: true },
  { name: "origin/develop", isRemote: true },
]

/**
 * Hook for managing Git branch state
 */
export function useGitBranch(options: UseGitBranchOptions = {}) {
  const {
    initialBranch = "main",
    initialBranches,
    onBranchChange: externalOnBranchChange,
    onBranchCreate: externalOnBranchCreate,
  } = options

  const [currentBranch, setCurrentBranch] = useState(initialBranch)
  const [branches, setBranches] = useState<GitBranch[]>(
    () => initialBranches || createDefaultBranches(initialBranch)
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update current branch marker in branches list
  const updateCurrentBranchMarker = useCallback((branchName: string) => {
    setBranches((prev) =>
      prev.map((b) => ({
        ...b,
        isCurrent: b.name === branchName,
      }))
    )
  }, [])

  // Switch to a different branch
  const switchBranch = useCallback((branchName: string) => {
    // Check if branch exists
    const branchExists = branches.some((b) => b.name === branchName)
    if (!branchExists) {
      setError(`Branch "${branchName}" does not exist`)
      return false
    }

    setCurrentBranch(branchName)
    updateCurrentBranchMarker(branchName)
    externalOnBranchChange?.(branchName)
    setError(null)
    return true
  }, [branches, updateCurrentBranchMarker, externalOnBranchChange])

  // Create a new branch
  const createBranch = useCallback((branchName: string, switchTo: boolean = true) => {
    // Validate branch name
    const invalidChars = /[~^:?*\[\]\\@{}\s]/
    if (invalidChars.test(branchName)) {
      setError("Invalid branch name. Cannot contain special characters.")
      return false
    }

    // Check if branch already exists
    const branchExists = branches.some((b) => b.name === branchName)
    if (branchExists) {
      setError(`Branch "${branchName}" already exists`)
      return false
    }

    // Add new branch
    const newBranch: GitBranch = {
      name: branchName,
      isCurrent: switchTo,
    }

    setBranches((prev) => {
      const updated = switchTo
        ? prev.map((b) => ({ ...b, isCurrent: false }))
        : prev
      return [...updated, newBranch]
    })

    if (switchTo) {
      setCurrentBranch(branchName)
    }

    externalOnBranchCreate?.(branchName)
    setError(null)
    return true
  }, [branches, externalOnBranchCreate])

  // Delete a branch
  const deleteBranch = useCallback((branchName: string) => {
    // Cannot delete current branch
    if (branchName === currentBranch) {
      setError("Cannot delete the current branch")
      return false
    }

    // Cannot delete main/master
    if (branchName === "main" || branchName === "master") {
      setError("Cannot delete the main branch")
      return false
    }

    setBranches((prev) => prev.filter((b) => b.name !== branchName))
    setError(null)
    return true
  }, [currentBranch])

  // Refresh branches (simulated - in real app would fetch from Git)
  const refreshBranches = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))
      
      // In a real app, this would fetch branches from the Git repository
      // For now, we just keep the current branches
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh branches")
      setIsLoading(false)
    }
  }, [])

  // Set branches from external source (e.g., when loading a repo)
  const setBranchesFromRepo = useCallback((
    repoBranches: GitBranch[],
    defaultBranch?: string
  ) => {
    setBranches(repoBranches)
    
    const branch = defaultBranch || repoBranches.find((b) => b.isCurrent)?.name || "main"
    setCurrentBranch(branch)
  }, [])

  // Reset to default state
  const reset = useCallback(() => {
    setCurrentBranch("main")
    setBranches(createDefaultBranches("main"))
    setError(null)
    setIsLoading(false)
  }, [])

  // Get branch statistics
  const branchStats = useMemo(() => {
    const localBranches = branches.filter((b) => !b.isRemote)
    const remoteBranches = branches.filter((b) => b.isRemote)
    
    return {
      total: branches.length,
      local: localBranches.length,
      remote: remoteBranches.length,
    }
  }, [branches])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    currentBranch,
    branches,
    isLoading,
    error,
    branchStats,

    // Actions
    switchBranch,
    createBranch,
    deleteBranch,
    refreshBranches,
    setBranchesFromRepo,
    reset,
    clearError,
  }
}

