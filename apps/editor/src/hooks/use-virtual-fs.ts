import { useState, useCallback, useMemo } from "react"
import { 
  VirtualFileSystem, 
  loadGitHubRepo,
  getRepoBranches,
  type LoadProgress,
  type GitHubRepoInfo,
  type VirtualFile,
  type GitBranchInfo,
} from "@nexo/vfs"
import type { FileNode, AIStatus } from "@nexo/types"

/**
 * Convert VirtualFile to FileNode for the file tree component
 */
function virtualFileToNode(
  vfs: VirtualFileSystem,
  file: VirtualFile,
  aiStatuses: Map<string, AIStatus>
): FileNode {
  const children = file.children
    ?.map((childPath) => vfs.getFile(childPath))
    .filter((f): f is VirtualFile => f !== undefined)
    .sort((a, b) => {
      // Folders first
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map((child) => virtualFileToNode(vfs, child, aiStatuses))

  return {
    id: file.id,
    name: file.name,
    type: file.type,
    path: file.path,
    language: file.language,
    content: file.content,
    children,
    state: {
      isDirty: false,
      aiStatus: aiStatuses.get(file.path) ?? "none",
    },
  }
}

export function useVirtualFS() {
  const [vfs] = useState(() => new VirtualFileSystem())
  const [isLoaded, setIsLoaded] = useState(false)
  const [progress, setProgress] = useState<LoadProgress | null>(null)
  const [repoName, setRepoName] = useState<string>("project")
  const [aiStatuses, setAIStatuses] = useState<Map<string, AIStatus>>(new Map())
  const [version, setVersion] = useState(0) // For triggering re-renders
  
  // Git branch state
  const [branches, setBranches] = useState<GitBranchInfo[]>([])
  const [currentBranch, setCurrentBranch] = useState<string>("main")
  const [repoInfo, setRepoInfo] = useState<GitHubRepoInfo | null>(null)
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)

  // Get file tree as FileNode[]
  const fileTree = useMemo((): FileNode[] => {
    if (!isLoaded) {
      console.log("[VFS] fileTree: not loaded yet")
      return []
    }
    
    // Force re-compute when version changes
    void version
    
    const roots = vfs.getRootEntries()
    console.log("[VFS] fileTree computing - roots:", roots.length, roots.map(r => r.path))
    
    const tree = roots.map((file) => virtualFileToNode(vfs, file, aiStatuses))
    console.log("[VFS] fileTree result:", tree.length, tree.map(t => ({ name: t.name, childrenCount: t.children?.length })))
    
    return tree
  }, [vfs, isLoaded, aiStatuses, version])

  // Load from local files
  const loadLocal = useCallback(async (
    entries: Array<{ path: string; file: File }>,
    name: string
  ) => {
    console.log("[VFS] loadLocal called:", { entriesCount: entries.length, name })
    console.log("[VFS] Sample paths:", entries.slice(0, 5).map(e => e.path))
    
    setProgress({ phase: "scanning", current: 0, total: 0, message: "Starting..." })
    
    vfs.onProgress(setProgress)
    
    try {
      await vfs.loadFromLocalFiles(entries, name)
      
      const roots = vfs.getRootEntries()
      console.log("[VFS] After load - roots:", roots.map(r => ({ path: r.path, name: r.name, childrenCount: r.children?.length })))
      
      setRepoName(name)
      setIsLoaded(true)
      setVersion((v) => v + 1)
    } catch (err) {
      console.error("[VFS] loadLocal error:", err)
      setProgress({
        phase: "error",
        current: 0,
        total: 0,
        error: (err as Error).message,
        message: "Failed to load files",
      })
    }
  }, [vfs])

  // Fetch branches for a GitHub repository
  const fetchBranches = useCallback(async (info: GitHubRepoInfo) => {
    setIsLoadingBranches(true)
    try {
      const branchList = await getRepoBranches(info.owner, info.repo, info.token)
      setBranches(branchList)
      
      // Set current branch
      const defaultBranch = branchList.find(b => b.isDefault)
      if (defaultBranch) {
        setCurrentBranch(info.branch || defaultBranch.name)
      }
      
      return branchList
    } catch (err) {
      console.error("Failed to fetch branches:", err)
      return []
    } finally {
      setIsLoadingBranches(false)
    }
  }, [])

  // Switch to a different branch (reloads the repository)
  const switchBranch = useCallback(async (branchName: string) => {
    if (!repoInfo) return false
    
    // Update current branch first for UI feedback
    setCurrentBranch(branchName)
    
    // Reload the repository with the new branch
    const newInfo: GitHubRepoInfo = {
      ...repoInfo,
      branch: branchName,
    }
    
    await loadGitHubWithBranches(newInfo)
    return true
  }, [repoInfo])

  // Load from GitHub with branches
  const loadGitHubWithBranches = useCallback(async (info: GitHubRepoInfo) => {
    setProgress({ phase: "scanning", current: 0, total: 0, message: "Connecting to GitHub..." })
    setRepoInfo(info)
    
    try {
      // Fetch branches in parallel with repo content
      const branchesPromise = fetchBranches(info)
      
      const { files, totalSize } = await loadGitHubRepo(info, setProgress)
      
      // Clear and reload VFS
      vfs.clear()
      
      // Separate folders and files, then sort folders by path depth
      const folders: Array<[string, VirtualFile]> = []
      const regularFiles: Array<[string, VirtualFile]> = []
      
      for (const [path, file] of files) {
        if (file.type === "folder") {
          folders.push([path, file])
        } else {
          regularFiles.push([path, file])
        }
      }
      
      // Sort folders by path depth (shorter paths first = parent folders first)
      folders.sort((a, b) => a[0].split("/").length - b[0].split("/").length)
      
      // Create folders first (in order from root to leaf)
      for (const [path] of folders) {
        vfs.createFolder(path)
      }
      
      // Then create files
      for (const [path, file] of regularFiles) {
        const created = vfs.createFile(path, file.content ?? "")
        if (created) {
          created.contentLoaded = file.contentLoaded
          created.size = file.size
        }
      }
      
      // Wait for branches to finish loading
      await branchesPromise
      
      setRepoName(`${info.owner}/${info.repo}`)
      setIsLoaded(true)
      setVersion((v) => v + 1)
      
      setProgress({
        phase: "complete",
        current: files.size,
        total: files.size,
        message: `Loaded ${files.size} files (${formatBytes(totalSize)})`,
      })
    } catch (err) {
      setProgress({
        phase: "error",
        current: 0,
        total: 0,
        error: (err as Error).message,
        message: (err as Error).message,
      })
    }
  }, [vfs, fetchBranches])

  // Load from GitHub (alias for loadGitHubWithBranches)
  const loadGitHub = useCallback(async (info: GitHubRepoInfo) => {
    await loadGitHubWithBranches(info)
  }, [loadGitHubWithBranches])

  // Get file content
  const getFileContent = useCallback(async (path: string): Promise<string | null> => {
    return vfs.getContent(path)
  }, [vfs])

  // Update file content
  const updateFileContent = useCallback((path: string, content: string) => {
    vfs.updateContent(path, content)
    setVersion((v) => v + 1)
  }, [vfs])

  // Set AI status for a file
  const setFileAIStatus = useCallback((path: string, status: AIStatus) => {
    setAIStatuses((prev) => {
      const next = new Map(prev)
      if (status === "none") {
        next.delete(path)
      } else {
        next.set(path, status)
      }
      return next
    })
  }, [])

  // Search files
  const searchFiles = useCallback((query: string, options?: {
    languages?: string[]
    maxResults?: number
  }) => {
    return vfs.search({
      pattern: query.includes("*") ? query : `*${query}*`,
      languages: options?.languages,
      maxResults: options?.maxResults ?? 50,
    })
  }, [vfs])

  // Search content
  const searchContent = useCallback((query: string, options?: {
    languages?: string[]
    caseSensitive?: boolean
    regex?: boolean
    maxResults?: number
  }) => {
    return vfs.search({
      content: query,
      languages: options?.languages,
      caseSensitive: options?.caseSensitive,
      regex: options?.regex,
      maxResults: options?.maxResults ?? 50,
    })
  }, [vfs])

  // Find importers of a file
  const findImporters = useCallback((path: string) => {
    return vfs.findImporters(path)
  }, [vfs])

  // Find imports of a file
  const findImports = useCallback((path: string) => {
    return vfs.findImports(path)
  }, [vfs])

  // Get stats
  const getStats = useCallback(() => {
    return vfs.getStats()
  }, [vfs])

  // Clear and reset
  const clear = useCallback(() => {
    vfs.clear()
    setIsLoaded(false)
    setProgress(null)
    setRepoName("project")
    setAIStatuses(new Map())
    setBranches([])
    setCurrentBranch("main")
    setRepoInfo(null)
    setVersion((v) => v + 1)
  }, [vfs])

  // Refresh branches list
  const refreshBranches = useCallback(async () => {
    if (!repoInfo) return
    await fetchBranches(repoInfo)
  }, [repoInfo, fetchBranches])

  return {
    // State
    isLoaded,
    progress,
    repoName,
    fileTree,
    
    // Git branch state
    branches,
    currentBranch,
    isLoadingBranches,
    
    // Load operations
    loadLocal,
    loadGitHub,
    clear,
    
    // Branch operations
    switchBranch,
    refreshBranches,
    
    // File operations
    getFileContent,
    updateFileContent,
    setFileAIStatus,
    
    // Search operations
    searchFiles,
    searchContent,
    findImporters,
    findImports,
    
    // Stats
    getStats,
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

