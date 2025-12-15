import type { 
  VirtualFile, 
  FileIndex, 
  RepoMetadata, 
  LoadProgress,
  FileSearchQuery,
  FileSearchResult 
} from "./types"
import { 
  createFileIndex, 
  indexFile, 
  unindexFile, 
  searchFiles,
  findImporters,
  findImports,
  findBySymbol,
  getFilesInFolder,
  getIndexStats
} from "./file-index"
import { 
  getLanguage, 
  getExtension, 
  isBinaryFile, 
  getMimeType,
  shouldIgnorePath,
  analyzeLanguages
} from "./language-detector"

export type ProgressCallback = (progress: LoadProgress) => void

/**
 * Virtual File System
 * Manages a repository's files in memory with indexing and search capabilities
 */
export class VirtualFileSystem {
  private files: Map<string, VirtualFile> = new Map()
  private index: FileIndex = createFileIndex()
  private metadata: RepoMetadata | null = null
  private progressCallback: ProgressCallback | null = null

  /**
   * Set progress callback for loading operations
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback
  }

  private reportProgress(progress: LoadProgress): void {
    this.progressCallback?.(progress)
  }

  /**
   * Get repository metadata
   */
  getMetadata(): RepoMetadata | null {
    return this.metadata
  }

  /**
   * Get a file by path
   */
  getFile(path: string): VirtualFile | undefined {
    return this.files.get(this.normalizePath(path))
  }

  /**
   * Check if a file exists
   */
  exists(path: string): boolean {
    return this.files.has(this.normalizePath(path))
  }

  /**
   * Get file content (lazy load if needed)
   */
  async getContent(path: string): Promise<string | null> {
    const file = this.getFile(path)
    if (!file || file.type === "folder") return null
    
    if (file.contentLoaded && file.content !== undefined) {
      return file.content
    }
    
    // In a real implementation, this would fetch content from backend
    return file.content ?? null
  }

  /**
   * Update file content
   */
  updateContent(path: string, content: string): boolean {
    const file = this.getFile(path)
    if (!file || file.type === "folder") return false
    
    file.content = content
    file.contentLoaded = true
    file.size = new TextEncoder().encode(content).length
    file.lastModified = new Date()
    
    // Re-analyze imports/exports
    this.analyzeFileImports(file)
    
    // Re-index
    indexFile(this.index, file)
    
    return true
  }

  /**
   * Create a new file
   */
  createFile(path: string, content: string = ""): VirtualFile | null {
    const normalizedPath = this.normalizePath(path)
    if (this.exists(normalizedPath)) return null
    
    const name = normalizedPath.split("/").pop() ?? ""
    const parentPath = this.getParentPath(normalizedPath)
    
    const file: VirtualFile = {
      id: this.generateId(),
      path: normalizedPath,
      name,
      type: "file",
      size: new TextEncoder().encode(content).length,
      language: getLanguage(name),
      extension: getExtension(name),
      mimeType: getMimeType(name),
      content,
      contentLoaded: true,
      lastModified: new Date(),
      isSymlink: false,
      isBinary: isBinaryFile(name),
      parentPath,
    }
    
    // Analyze imports
    this.analyzeFileImports(file)
    
    // Add to files
    this.files.set(normalizedPath, file)
    
    // Index
    indexFile(this.index, file)
    
    // Update parent folder
    if (parentPath) {
      const parent = this.getFile(parentPath)
      if (parent && parent.type === "folder") {
        parent.children = parent.children ?? []
        if (!parent.children.includes(normalizedPath)) {
          parent.children.push(normalizedPath)
        }
      }
    }
    
    // Update metadata
    if (this.metadata) {
      this.metadata.totalFiles++
      this.metadata.totalSize += file.size
    }
    
    return file
  }

  /**
   * Create a folder
   */
  createFolder(path: string): VirtualFile | null {
    const normalizedPath = this.normalizePath(path)
    if (this.exists(normalizedPath)) return null
    
    const name = normalizedPath.split("/").pop() ?? ""
    const parentPath = this.getParentPath(normalizedPath)
    
    const folder: VirtualFile = {
      id: this.generateId(),
      path: normalizedPath,
      name,
      type: "folder",
      size: 0,
      contentLoaded: true,
      lastModified: new Date(),
      isSymlink: false,
      isBinary: false,
      parentPath,
      children: [],
    }
    
    this.files.set(normalizedPath, folder)
    indexFile(this.index, folder)
    
    // Update parent
    if (parentPath) {
      const parent = this.getFile(parentPath)
      if (parent && parent.type === "folder") {
        parent.children = parent.children ?? []
        if (!parent.children.includes(normalizedPath)) {
          parent.children.push(normalizedPath)
        }
      }
    }
    
    return folder
  }

  /**
   * Delete a file or folder
   */
  delete(path: string): boolean {
    const normalizedPath = this.normalizePath(path)
    const file = this.getFile(normalizedPath)
    if (!file) return false
    
    // Recursively delete children for folders
    if (file.type === "folder" && file.children) {
      for (const childPath of [...file.children]) {
        this.delete(childPath)
      }
    }
    
    // Remove from index
    unindexFile(this.index, normalizedPath)
    
    // Remove from files
    this.files.delete(normalizedPath)
    
    // Remove from parent
    if (file.parentPath) {
      const parent = this.getFile(file.parentPath)
      if (parent && parent.children) {
        const idx = parent.children.indexOf(normalizedPath)
        if (idx !== -1) parent.children.splice(idx, 1)
      }
    }
    
    // Update metadata
    if (this.metadata && file.type === "file") {
      this.metadata.totalFiles--
      this.metadata.totalSize -= file.size
    }
    
    return true
  }

  /**
   * Rename/move a file
   */
  rename(oldPath: string, newPath: string): boolean {
    const file = this.getFile(oldPath)
    if (!file) return false
    if (this.exists(newPath)) return false
    
    const normalizedNewPath = this.normalizePath(newPath)
    const newName = normalizedNewPath.split("/").pop() ?? ""
    const newParentPath = this.getParentPath(normalizedNewPath)
    
    // Unindex old
    unindexFile(this.index, oldPath)
    this.files.delete(oldPath)
    
    // Update file
    file.path = normalizedNewPath
    file.name = newName
    file.parentPath = newParentPath
    
    if (file.type === "file") {
      file.language = getLanguage(newName)
      file.extension = getExtension(newName)
      file.mimeType = getMimeType(newName)
    }
    
    // Re-add
    this.files.set(normalizedNewPath, file)
    indexFile(this.index, file)
    
    return true
  }

  /**
   * Search files
   */
  search(query: FileSearchQuery): FileSearchResult[] {
    return searchFiles(this.index, query)
  }

  /**
   * Find files that import a given file
   */
  findImporters(path: string): string[] {
    return findImporters(this.index, this.normalizePath(path))
  }

  /**
   * Find files imported by a given file
   */
  findImports(path: string): string[] {
    return findImports(this.index, this.normalizePath(path))
  }

  /**
   * Find files that export a symbol
   */
  findBySymbol(symbol: string): string[] {
    return findBySymbol(this.index, symbol)
  }

  /**
   * Get children of a folder
   */
  getChildren(folderPath: string): VirtualFile[] {
    return getFilesInFolder(this.index, this.normalizePath(folderPath))
  }

  /**
   * Get root files and folders
   */
  getRootEntries(): VirtualFile[] {
    const roots: VirtualFile[] = []
    
    for (const file of this.files.values()) {
      // Root entries have no parent or parent is "/" or parent is root folder name
      const isRoot = !file.parentPath || file.parentPath === "/" || file.parentPath === ""
      if (isRoot) {
        roots.push(file)
      }
    }
    
    return roots.sort((a, b) => {
      // Folders first
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * Get all files as a tree structure
   */
  getFileTree(): VirtualFile[] {
    const buildTree = (files: VirtualFile[]): VirtualFile[] => {
      return files
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "folder" ? -1 : 1
          return a.name.localeCompare(b.name)
        })
        .map((file) => {
          if (file.type === "folder" && file.children) {
            const children = file.children
              .map((path) => this.getFile(path))
              .filter((f): f is VirtualFile => f !== undefined)
            return { ...file, children: buildTree(children).map(c => c.path) }
          }
          return file
        })
    }
    
    return buildTree(this.getRootEntries())
  }

  /**
   * Get statistics
   */
  getStats() {
    return getIndexStats(this.index)
  }

  /**
   * Clear all files
   */
  clear(): void {
    this.files.clear()
    this.index = createFileIndex()
    this.metadata = null
  }

  /**
   * Load files from local file entries (File System Access API or input[type=file])
   */
  async loadFromLocalFiles(
    entries: Array<{ path: string; file: File }>,
    repoName: string
  ): Promise<void> {
    console.log("[VFS.loadFromLocalFiles] Starting with", entries.length, "entries, repoName:", repoName)
    
    this.clear()
    
    const totalFiles = entries.length
    let processed = 0
    
    this.reportProgress({
      phase: "scanning",
      current: 0,
      total: totalFiles,
      message: "Scanning files...",
    })
    
    // First pass: create folder structure
    const folders = new Set<string>()
    for (const entry of entries) {
      // Normalize path - remove leading slash if present
      const normalizedEntryPath = entry.path.replace(/^\/+/, "")
      const parts = normalizedEntryPath.split("/").filter(p => p)
      
      let currentPath = ""
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
        folders.add(currentPath)
      }
    }
    
    // Create folders (sorted to ensure parent folders are created first)
    const sortedFolders = [...folders].sort()
    console.log("[VFS.loadFromLocalFiles] Creating folders:", sortedFolders.slice(0, 10))
    
    for (const folderPath of sortedFolders) {
      const normalized = "/" + folderPath
      if (!this.exists(normalized)) {
        this.createFolder(normalized)
      }
    }
    
    console.log("[VFS.loadFromLocalFiles] Folders created, files map size:", this.files.size)
    
    this.reportProgress({
      phase: "indexing",
      current: 0,
      total: totalFiles,
      message: "Loading files...",
    })
    
    // Second pass: load files
    let totalSize = 0
    for (const entry of entries) {
      const normalizedPath = this.normalizePath(entry.path)
      
      if (shouldIgnorePath(normalizedPath)) {
        processed++
        continue
      }
      
      const name = normalizedPath.split("/").pop() ?? ""
      const parentPath = this.getParentPath(normalizedPath)
      const binary = isBinaryFile(name)
      
      let content: string | undefined
      if (!binary && entry.file.size < 1024 * 1024) { // Skip files > 1MB
        try {
          content = await entry.file.text()
        } catch {
          content = undefined
        }
      }
      
      const file: VirtualFile = {
        id: this.generateId(),
        path: normalizedPath,
        name,
        type: "file",
        size: entry.file.size,
        language: getLanguage(name),
        extension: getExtension(name),
        mimeType: entry.file.type || getMimeType(name),
        content,
        contentLoaded: content !== undefined,
        lastModified: new Date(entry.file.lastModified),
        isSymlink: false,
        isBinary: binary,
        parentPath,
      }
      
      // Analyze imports for code files
      if (content) {
        this.analyzeFileImports(file)
      }
      
      this.files.set(normalizedPath, file)
      indexFile(this.index, file)
      
      // Update parent
      if (parentPath) {
        const parent = this.getFile(parentPath)
        if (parent && parent.type === "folder") {
          parent.children = parent.children ?? []
          parent.children.push(normalizedPath)
        }
      }
      
      totalSize += entry.file.size
      processed++
      
      if (processed % 50 === 0) {
        this.reportProgress({
          phase: "indexing",
          current: processed,
          total: totalFiles,
          currentFile: normalizedPath,
          message: `Loading ${name}...`,
        })
      }
    }
    
    // Build metadata
    this.metadata = {
      id: this.generateId(),
      name: repoName,
      source: "local",
      lastSynced: new Date(),
      totalFiles: this.files.size,
      totalSize,
      languages: analyzeLanguages([...this.files.values()]),
    }
    
    console.log("[VFS.loadFromLocalFiles] Complete. Total files:", this.files.size)
    console.log("[VFS.loadFromLocalFiles] Root entries:", this.getRootEntries().map(r => r.path))
    
    this.reportProgress({
      phase: "complete",
      current: totalFiles,
      total: totalFiles,
      message: `Loaded ${this.files.size} files`,
    })
  }

  /**
   * Analyze imports and exports for a file
   */
  private analyzeFileImports(file: VirtualFile): void {
    if (!file.content || file.isBinary) return
    
    const imports: string[] = []
    const exports: string[] = []
    
    // TypeScript/JavaScript imports
    if (file.language === "typescript" || file.language === "javascript") {
      // import ... from '...'
      const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g
      let match
      while ((match = importRegex.exec(file.content)) !== null) {
        imports.push(match[1])
      }
      
      // require('...')
      const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      while ((match = requireRegex.exec(file.content)) !== null) {
        imports.push(match[1])
      }
      
      // export const/function/class/type/interface name
      const exportRegex = /export\s+(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/g
      while ((match = exportRegex.exec(file.content)) !== null) {
        exports.push(match[1])
      }
      
      // export { ... }
      const exportBracketRegex = /export\s*\{([^}]+)\}/g
      while ((match = exportBracketRegex.exec(file.content)) !== null) {
        const names = match[1].split(",").map(s => s.trim().split(/\s+as\s+/)[0].trim())
        exports.push(...names.filter(n => n))
      }
      
      // export default
      if (/export\s+default/.test(file.content)) {
        exports.push("default")
      }
    }
    
    // Python imports
    if (file.language === "python") {
      const pyImportRegex = /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/g
      let match
      while ((match = pyImportRegex.exec(file.content)) !== null) {
        if (match[1]) {
          imports.push(match[1])
        } else {
          const modules = match[2].split(",").map(s => s.trim().split(/\s+as\s+/)[0].trim())
          imports.push(...modules)
        }
      }
    }
    
    file.imports = imports.length > 0 ? imports : undefined
    file.exports = exports.length > 0 ? exports : undefined
  }

  private normalizePath(path: string): string {
    // Ensure path starts with /
    let normalized = path.replace(/\\/g, "/")
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized
    }
    // Remove trailing slash
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  }

  private getParentPath(path: string): string | null {
    const lastSlash = path.lastIndexOf("/")
    if (lastSlash <= 0) return null
    return path.slice(0, lastSlash) || "/"
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  }
}

