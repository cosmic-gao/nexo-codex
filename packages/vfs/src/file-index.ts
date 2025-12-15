import type { 
  VirtualFile, 
  FileIndex, 
  FileSearchQuery, 
  FileSearchResult,
  ContentMatch 
} from "./types"

/**
 * Create an empty file index
 */
export function createFileIndex(): FileIndex {
  return {
    byPath: new Map(),
    byLanguage: new Map(),
    byExtension: new Map(),
    folders: new Map(),
    symbols: new Map(),
    importGraph: new Map(),
    exportGraph: new Map(),
  }
}

/**
 * Add a file to the index
 */
export function indexFile(index: FileIndex, file: VirtualFile): void {
  // Index by path
  index.byPath.set(file.path, file)
  
  // Index by language
  if (file.language) {
    if (!index.byLanguage.has(file.language)) {
      index.byLanguage.set(file.language, new Set())
    }
    index.byLanguage.get(file.language)!.add(file.path)
  }
  
  // Index by extension
  if (file.extension) {
    if (!index.byExtension.has(file.extension)) {
      index.byExtension.set(file.extension, new Set())
    }
    index.byExtension.get(file.extension)!.add(file.path)
  }
  
  // Index folder structure
  if (file.parentPath) {
    if (!index.folders.has(file.parentPath)) {
      index.folders.set(file.parentPath, new Set())
    }
    index.folders.get(file.parentPath)!.add(file.path)
  }
  
  // Index symbols (exports)
  if (file.exports) {
    for (const symbol of file.exports) {
      if (!index.symbols.has(symbol)) {
        index.symbols.set(symbol, [])
      }
      index.symbols.get(symbol)!.push(file.path)
    }
  }
  
  // Index import graph
  if (file.imports) {
    index.importGraph.set(file.path, new Set(file.imports))
    
    // Build reverse graph (who imports this file)
    for (const imp of file.imports) {
      if (!index.exportGraph.has(imp)) {
        index.exportGraph.set(imp, new Set())
      }
      index.exportGraph.get(imp)!.add(file.path)
    }
  }
}

/**
 * Remove a file from the index
 */
export function unindexFile(index: FileIndex, path: string): void {
  const file = index.byPath.get(path)
  if (!file) return
  
  // Remove from path index
  index.byPath.delete(path)
  
  // Remove from language index
  if (file.language) {
    index.byLanguage.get(file.language)?.delete(path)
  }
  
  // Remove from extension index
  if (file.extension) {
    index.byExtension.get(file.extension)?.delete(path)
  }
  
  // Remove from folder index
  if (file.parentPath) {
    index.folders.get(file.parentPath)?.delete(path)
  }
  
  // Remove from symbol index
  if (file.exports) {
    for (const symbol of file.exports) {
      const paths = index.symbols.get(symbol)
      if (paths) {
        const idx = paths.indexOf(path)
        if (idx !== -1) paths.splice(idx, 1)
      }
    }
  }
  
  // Remove from import graph
  index.importGraph.delete(path)
  for (const set of index.exportGraph.values()) {
    set.delete(path)
  }
}

/**
 * Match a glob pattern against a string
 */
function matchGlob(pattern: string, str: string): boolean {
  // Simple glob matching (supports * and **)
  const regex = pattern
    .replace(/\*\*/g, "{{DOUBLESTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{DOUBLESTAR}}/g, ".*")
    .replace(/\?/g, ".")
  
  return new RegExp(`^${regex}$`, "i").test(str)
}

/**
 * Search files in the index
 */
export function searchFiles(
  index: FileIndex,
  query: FileSearchQuery
): FileSearchResult[] {
  const results: FileSearchResult[] = []
  const maxResults = query.maxResults ?? 100
  
  // Get candidate files
  let candidates: Set<string>
  
  if (query.languages && query.languages.length > 0) {
    // Start with language filter
    candidates = new Set()
    for (const lang of query.languages) {
      const files = index.byLanguage.get(lang)
      if (files) {
        for (const path of files) candidates.add(path)
      }
    }
  } else if (query.extensions && query.extensions.length > 0) {
    // Start with extension filter
    candidates = new Set()
    for (const ext of query.extensions) {
      const files = index.byExtension.get(ext)
      if (files) {
        for (const path of files) candidates.add(path)
      }
    }
  } else {
    // All files
    candidates = new Set(index.byPath.keys())
  }
  
  // Filter by path prefixes
  if (query.paths && query.paths.length > 0) {
    const filtered = new Set<string>()
    for (const path of candidates) {
      if (query.paths.some((prefix) => path.startsWith(prefix))) {
        filtered.add(path)
      }
    }
    candidates = filtered
  }
  
  // Exclude paths
  if (query.excludePaths && query.excludePaths.length > 0) {
    for (const path of [...candidates]) {
      if (query.excludePaths.some((exclude) => path.startsWith(exclude))) {
        candidates.delete(path)
      }
    }
  }
  
  // Filter by pattern
  if (query.pattern) {
    const filtered = new Set<string>()
    for (const path of candidates) {
      const filename = path.split("/").pop() ?? ""
      if (matchGlob(query.pattern, filename) || matchGlob(query.pattern, path)) {
        filtered.add(path)
      }
    }
    candidates = filtered
  }
  
  // Search content
  for (const path of candidates) {
    if (results.length >= maxResults) break
    
    const file = index.byPath.get(path)
    if (!file) continue
    
    let score = 1
    let matches: ContentMatch[] | undefined
    
    // Content search
    if (query.content && file.content && file.contentLoaded) {
      const searchMatches = searchInContent(
        file.content,
        query.content,
        query.caseSensitive ?? false,
        query.regex ?? false
      )
      
      if (searchMatches.length === 0) continue
      
      matches = searchMatches
      score = searchMatches.length
    }
    
    results.push({ file, matches, score })
  }
  
  // Sort by score
  results.sort((a, b) => b.score - a.score)
  
  return results
}

/**
 * Search for content within a file
 */
function searchInContent(
  content: string,
  search: string,
  caseSensitive: boolean,
  isRegex: boolean
): ContentMatch[] {
  const matches: ContentMatch[] = []
  const lines = content.split("\n")
  
  let pattern: RegExp
  try {
    pattern = isRegex
      ? new RegExp(search, caseSensitive ? "g" : "gi")
      : new RegExp(escapeRegex(search), caseSensitive ? "g" : "gi")
  } catch {
    return matches
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let match: RegExpExecArray | null
    
    pattern.lastIndex = 0
    while ((match = pattern.exec(line)) !== null) {
      matches.push({
        line: i + 1,
        column: match.index + 1,
        length: match[0].length,
        lineContent: line,
        context: {
          before: lines.slice(Math.max(0, i - 2), i),
          after: lines.slice(i + 1, i + 3),
        },
      })
      
      // Prevent infinite loop on zero-length matches
      if (match[0].length === 0) break
    }
  }
  
  return matches
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Find files that import a given file
 */
export function findImporters(index: FileIndex, filePath: string): string[] {
  return [...(index.exportGraph.get(filePath) ?? [])]
}

/**
 * Find files imported by a given file
 */
export function findImports(index: FileIndex, filePath: string): string[] {
  return [...(index.importGraph.get(filePath) ?? [])]
}

/**
 * Find files by symbol name
 */
export function findBySymbol(index: FileIndex, symbol: string): string[] {
  return index.symbols.get(symbol) ?? []
}

/**
 * Get files in a folder (non-recursive)
 */
export function getFilesInFolder(index: FileIndex, folderPath: string): VirtualFile[] {
  const paths = index.folders.get(folderPath)
  if (!paths) return []
  
  const files: VirtualFile[] = []
  for (const path of paths) {
    const file = index.byPath.get(path)
    if (file) files.push(file)
  }
  
  return files
}

/**
 * Get statistics about the index
 */
export function getIndexStats(index: FileIndex) {
  const languageCounts: Record<string, number> = {}
  for (const [lang, files] of index.byLanguage) {
    languageCounts[lang] = files.size
  }
  
  return {
    totalFiles: index.byPath.size,
    totalFolders: index.folders.size,
    languages: languageCounts,
    totalSymbols: index.symbols.size,
  }
}

