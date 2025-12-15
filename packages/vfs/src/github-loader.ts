import type { GitHubRepoInfo, LoadProgress, VirtualFile } from "./types"
import { getLanguage, getExtension, getMimeType, isBinaryFile, shouldIgnorePath } from "./language-detector"

const GITHUB_API = "https://api.github.com"

interface GitHubTreeItem {
  path: string
  mode: string
  type: "blob" | "tree"
  sha: string
  size?: number
  url: string
}

interface GitHubTree {
  sha: string
  url: string
  tree: GitHubTreeItem[]
  truncated: boolean
}

interface GitHubContent {
  name: string
  path: string
  sha: string
  size: number
  type: "file" | "dir"
  content?: string
  encoding?: string
  download_url: string | null
}

interface GitHubBranch {
  name: string
  commit: {
    sha: string
    url: string
  }
  protected: boolean
}

export interface GitBranchInfo {
  name: string
  sha: string
  isProtected: boolean
  isDefault: boolean
  isRemote?: boolean
}

/**
 * Parse GitHub URL to extract owner and repo
 */
export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  // Support various formats:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  // https://github.com/owner/repo/tree/branch
  // https://github.com/owner/repo/tree/branch/path
  // git@github.com:owner/repo.git
  // owner/repo
  
  let match: RegExpMatchArray | null
  
  // Standard HTTPS URL
  match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?(?:\/tree\/([^\/]+)(?:\/(.+))?)?/)
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      branch: match[3],
      path: match[4],
    }
  }
  
  // SSH URL
  match = url.match(/git@github\.com:([^\/]+)\/([^\.]+)(?:\.git)?/)
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
    }
  }
  
  // Simple owner/repo format
  match = url.match(/^([^\/]+)\/([^\/]+)$/)
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
    }
  }
  
  return null
}

/**
 * Fetch GitHub API with authentication
 */
async function fetchGitHub(
  endpoint: string,
  token?: string
): Promise<Response> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  const response = await fetch(`${GITHUB_API}${endpoint}`, { headers })
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Rate limit exceeded. Please provide a GitHub token.")
    }
    if (response.status === 404) {
      throw new Error("Repository not found or is private.")
    }
    throw new Error(`GitHub API error: ${response.status}`)
  }
  
  return response
}

/**
 * Get repository info including default branch
 */
export async function getRepoInfo(
  owner: string,
  repo: string,
  token?: string
): Promise<{ defaultBranch: string; isPrivate: boolean; description: string | null }> {
  const response = await fetchGitHub(`/repos/${owner}/${repo}`, token)
  const data = await response.json()
  return {
    defaultBranch: data.default_branch,
    isPrivate: data.private,
    description: data.description,
  }
}

/**
 * Get the default branch of a repository
 */
export async function getDefaultBranch(
  owner: string,
  repo: string,
  token?: string
): Promise<string> {
  const info = await getRepoInfo(owner, repo, token)
  return info.defaultBranch
}

/**
 * Get all branches of a repository
 */
export async function getRepoBranches(
  owner: string,
  repo: string,
  token?: string
): Promise<GitBranchInfo[]> {
  const branches: GitBranchInfo[] = []
  
  // Get repo info for default branch
  const repoInfo = await getRepoInfo(owner, repo, token)
  const defaultBranch = repoInfo.defaultBranch
  
  // Get all branches (paginated)
  let page = 1
  const perPage = 100
  let hasMore = true
  
  while (hasMore) {
    const response = await fetchGitHub(
      `/repos/${owner}/${repo}/branches?per_page=${perPage}&page=${page}`,
      token
    )
    const data: GitHubBranch[] = await response.json()
    
    for (const branch of data) {
      branches.push({
        name: branch.name,
        sha: branch.commit.sha,
        isProtected: branch.protected,
        isDefault: branch.name === defaultBranch,
      })
    }
    
    hasMore = data.length === perPage
    page++
    
    // Safety limit
    if (page > 10) break
  }
  
  // Sort: default first, then protected, then alphabetically
  branches.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    if (a.isProtected && !b.isProtected) return -1
    if (!a.isProtected && b.isProtected) return 1
    return a.name.localeCompare(b.name)
  })
  
  return branches
}

/**
 * Get the file tree of a repository
 */
export async function getRepoTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string
): Promise<GitHubTree> {
  const response = await fetchGitHub(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token
  )
  return response.json()
}

/**
 * Get file content
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token?: string
): Promise<string | null> {
  try {
    const response = await fetchGitHub(
      `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      token
    )
    const data: GitHubContent = await response.json()
    
    if (data.content && data.encoding === "base64") {
      return atob(data.content.replace(/\n/g, ""))
    }
    
    // For large files, use raw download
    if (data.download_url) {
      const rawResponse = await fetch(data.download_url)
      return rawResponse.text()
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Load a GitHub repository into virtual files
 */
export async function loadGitHubRepo(
  info: GitHubRepoInfo,
  onProgress?: (progress: LoadProgress) => void
): Promise<{ files: Map<string, VirtualFile>; totalSize: number }> {
  const { owner, repo, token } = info
  const files = new Map<string, VirtualFile>()
  let totalSize = 0
  
  onProgress?.({
    phase: "scanning",
    current: 0,
    total: 0,
    message: "Connecting to GitHub...",
  })
  
  // Get default branch if not specified
  const branch = info.branch ?? await getDefaultBranch(owner, repo, token)
  
  onProgress?.({
    phase: "scanning",
    current: 0,
    total: 0,
    message: `Fetching repository tree (${branch})...`,
  })
  
  // Get full tree
  const tree = await getRepoTree(owner, repo, branch, token)
  
  if (tree.truncated) {
    console.warn("Repository tree is truncated due to size limits")
  }
  
  // Filter files
  const fileItems = tree.tree.filter((item) => {
    if (item.type !== "blob") return false
    
    const path = info.path ? `${info.path}/${item.path}` : item.path
    if (shouldIgnorePath(path)) return false
    
    // Skip very large files
    if (item.size && item.size > 1024 * 1024) return false
    
    return true
  })
  
  const folderItems = tree.tree.filter((item) => item.type === "tree")
  
  onProgress?.({
    phase: "indexing",
    current: 0,
    total: fileItems.length,
    message: `Found ${fileItems.length} files...`,
  })
  
  // Create folder structure
  const folders = new Set<string>()
  for (const item of folderItems) {
    const path = "/" + (info.path ? `${info.path}/${item.path}` : item.path)
    folders.add(path)
  }
  
  // Also infer parent folders from file paths
  for (const item of fileItems) {
    const parts = item.path.split("/")
    let current = ""
    for (let i = 0; i < parts.length - 1; i++) {
      current += "/" + parts[i]
      folders.add(current)
    }
  }
  
  // Create folder entries
  for (const folderPath of [...folders].sort()) {
    const name = folderPath.split("/").pop() ?? ""
    const parentPath = folderPath.split("/").slice(0, -1).join("/") || null
    
    const folder: VirtualFile = {
      id: `folder-${folderPath}`,
      path: folderPath,
      name,
      type: "folder",
      size: 0,
      contentLoaded: true,
      isSymlink: false,
      isBinary: false,
      parentPath,
      children: [],
    }
    
    files.set(folderPath, folder)
  }
  
  // Create file entries (without content initially)
  for (let i = 0; i < fileItems.length; i++) {
    const item = fileItems[i]
    const path = "/" + (info.path ? `${info.path}/${item.path}` : item.path)
    const name = path.split("/").pop() ?? ""
    const parentPath = path.split("/").slice(0, -1).join("/") || null
    const size = item.size ?? 0
    
    const file: VirtualFile = {
      id: `file-${item.sha}`,
      path,
      name,
      type: "file",
      size,
      language: getLanguage(name),
      extension: getExtension(name),
      mimeType: getMimeType(name),
      contentLoaded: false,
      isSymlink: false,
      isBinary: isBinaryFile(name),
      parentPath,
    }
    
    files.set(path, file)
    totalSize += size
    
    // Update parent folder children
    if (parentPath) {
      const parent = files.get(parentPath)
      if (parent && parent.type === "folder") {
        parent.children = parent.children ?? []
        parent.children.push(path)
      }
    }
    
    if (i % 100 === 0) {
      onProgress?.({
        phase: "indexing",
        current: i,
        total: fileItems.length,
        currentFile: path,
        message: `Indexing ${name}...`,
      })
    }
  }
  
  onProgress?.({
    phase: "complete",
    current: fileItems.length,
    total: fileItems.length,
    message: `Loaded ${files.size} files from ${owner}/${repo}`,
  })
  
  return { files, totalSize }
}

/**
 * Lazy load file content from GitHub
 */
export async function loadFileContent(
  file: VirtualFile,
  repoInfo: GitHubRepoInfo
): Promise<string | null> {
  if (file.contentLoaded && file.content !== undefined) {
    return file.content
  }
  
  if (file.isBinary) {
    return null
  }
  
  const { owner, repo, token } = repoInfo
  const branch = repoInfo.branch ?? "main"
  const path = file.path.startsWith("/") ? file.path.slice(1) : file.path
  
  const content = await getFileContent(owner, repo, path, branch, token)
  
  if (content !== null) {
    file.content = content
    file.contentLoaded = true
  }
  
  return content
}

