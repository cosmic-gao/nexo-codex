/**
 * Repository source type
 */
export type RepoSource = "local" | "github" | "gitlab" | "bitbucket"

/**
 * Repository metadata
 */
export interface RepoMetadata {
  id: string
  name: string
  source: RepoSource
  url?: string                    // Remote URL if applicable
  branch?: string                 // Current branch
  lastSynced?: Date
  totalFiles: number
  totalSize: number               // Total size in bytes
  languages: Record<string, number>  // Language -> file count
}

/**
 * Virtual file entry with metadata
 */
export interface VirtualFile {
  id: string
  path: string                    // Absolute path from repo root
  name: string
  type: "file" | "folder"
  size: number                    // Size in bytes
  language?: string
  mimeType?: string
  extension?: string
  
  // Content (lazy loaded)
  content?: string
  contentLoaded: boolean
  
  // Metadata
  lastModified?: Date
  isSymlink: boolean
  isBinary: boolean
  
  // Dependencies (for code files)
  imports?: string[]              // Imported modules/files
  exports?: string[]              // Exported symbols
  
  // Tree structure
  parentPath: string | null
  children?: string[]             // Child paths for folders
}

/**
 * File index for fast lookups
 */
export interface FileIndex {
  // Path-based lookups
  byPath: Map<string, VirtualFile>
  
  // Language-based grouping
  byLanguage: Map<string, Set<string>>
  
  // Extension-based grouping
  byExtension: Map<string, Set<string>>
  
  // Folder structure
  folders: Map<string, Set<string>>
  
  // Symbol index (exports)
  symbols: Map<string, string[]>   // symbol name -> file paths
  
  // Import graph
  importGraph: Map<string, Set<string>>   // file path -> imported paths
  exportGraph: Map<string, Set<string>>   // file path -> files that import it
}

/**
 * Search query for files
 */
export interface FileSearchQuery {
  // Text search
  pattern?: string                // File name pattern (glob)
  content?: string                // Content search
  
  // Filters
  languages?: string[]
  extensions?: string[]
  paths?: string[]                // Path prefixes
  excludePaths?: string[]
  
  // Options
  caseSensitive?: boolean
  regex?: boolean
  maxResults?: number
}

/**
 * Search result
 */
export interface FileSearchResult {
  file: VirtualFile
  matches?: ContentMatch[]
  score: number
}

/**
 * Content match within a file
 */
export interface ContentMatch {
  line: number
  column: number
  length: number
  lineContent: string
  context?: {
    before: string[]
    after: string[]
  }
}

/**
 * Repo loading progress
 */
export interface LoadProgress {
  phase: "scanning" | "indexing" | "analyzing" | "complete" | "error"
  current: number
  total: number
  currentFile?: string
  message?: string
  error?: string
}

/**
 * GitHub repository info
 */
export interface GitHubRepoInfo {
  owner: string
  repo: string
  branch?: string
  path?: string                   // Subdirectory to load
  token?: string                  // Personal access token
}

/**
 * Local upload options
 */
export interface LocalUploadOptions {
  excludePatterns?: string[]      // Patterns to exclude
  maxFileSize?: number            // Max file size in bytes
  maxTotalSize?: number           // Max total size
  followSymlinks?: boolean
}

