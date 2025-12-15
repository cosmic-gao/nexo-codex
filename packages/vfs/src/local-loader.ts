import type { LocalUploadOptions } from "./types"
import { shouldIgnorePath } from "./language-detector"

const DEFAULT_EXCLUDE_PATTERNS = [
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  ".next",
  ".nuxt",
  "__pycache__",
  ".pytest_cache",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
  "coverage",
  ".nyc_output",
  "target",
  "vendor",
  "Pods",
]

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024      // 5MB per file
const DEFAULT_MAX_TOTAL_SIZE = 100 * 1024 * 1024  // 100MB total

/**
 * Load files from a directory handle (File System Access API)
 */
export async function loadFromDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  options: LocalUploadOptions = {}
): Promise<Array<{ path: string; file: File }>> {
  const entries: Array<{ path: string; file: File }> = []
  const excludePatterns = options.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
  const maxTotalSize = options.maxTotalSize ?? DEFAULT_MAX_TOTAL_SIZE
  const rootName = dirHandle.name  // Include root folder name in paths
  
  let totalSize = 0
  
  async function processDirectory(
    handle: FileSystemDirectoryHandle,
    path: string
  ): Promise<void> {
    for await (const entry of handle.values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name
      
      // Check exclude patterns
      if (excludePatterns.some((p) => entry.name === p || entryPath.includes(`/${p}/`))) {
        continue
      }
      
      if (shouldIgnorePath(entryPath)) {
        continue
      }
      
      if (entry.kind === "file") {
        const fileHandle = entry as FileSystemFileHandle
        const file = await fileHandle.getFile()
        
        // Skip large files
        if (file.size > maxFileSize) {
          console.warn(`Skipping large file: ${entryPath} (${file.size} bytes)`)
          continue
        }
        
        // Check total size
        if (totalSize + file.size > maxTotalSize) {
          console.warn(`Total size limit reached, skipping remaining files`)
          return
        }
        
        totalSize += file.size
        // Include root folder name in path for consistency with loadFromFileList
        entries.push({ path: `${rootName}/${entryPath}`, file })
      } else if (entry.kind === "directory") {
        const subDirHandle = entry as FileSystemDirectoryHandle
        await processDirectory(subDirHandle, entryPath)
      }
    }
  }
  
  await processDirectory(dirHandle, "")
  
  return entries
}

/**
 * Load files from a FileList (input[type=file] with webkitdirectory)
 */
export function loadFromFileList(
  fileList: FileList,
  options: LocalUploadOptions = {}
): Array<{ path: string; file: File }> {
  const entries: Array<{ path: string; file: File }> = []
  const excludePatterns = options.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS
  const maxFileSize = options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE
  const maxTotalSize = options.maxTotalSize ?? DEFAULT_MAX_TOTAL_SIZE
  
  let totalSize = 0
  
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i]
    
    // Get relative path (webkitRelativePath includes folder name)
    const relativePath = file.webkitRelativePath || file.name
    
    // Check exclude patterns
    if (excludePatterns.some((p) => relativePath.includes(`/${p}/`) || relativePath.startsWith(`${p}/`))) {
      continue
    }
    
    if (shouldIgnorePath(relativePath)) {
      continue
    }
    
    // Skip large files
    if (file.size > maxFileSize) {
      console.warn(`Skipping large file: ${relativePath} (${file.size} bytes)`)
      continue
    }
    
    // Check total size
    if (totalSize + file.size > maxTotalSize) {
      console.warn(`Total size limit reached, skipping remaining files`)
      break
    }
    
    totalSize += file.size
    entries.push({ path: relativePath, file })
  }
  
  return entries
}

/**
 * Request directory access using File System Access API
 * Falls back to input[type=file] if not supported
 */
export async function requestDirectoryAccess(): Promise<FileSystemDirectoryHandle | null> {
  if (!("showDirectoryPicker" in window)) {
    return null
  }
  
  try {
    const handle = await (window as Window & { 
      showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> 
    }).showDirectoryPicker()
    return handle
  } catch (err) {
    // User cancelled or error
    if ((err as Error).name !== "AbortError") {
      console.error("Failed to access directory:", err)
    }
    return null
  }
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
  return "showDirectoryPicker" in window
}

