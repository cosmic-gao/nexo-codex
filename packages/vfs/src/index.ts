// Types
export type {
  RepoSource,
  RepoMetadata,
  VirtualFile,
  FileIndex,
  FileSearchQuery,
  FileSearchResult,
  ContentMatch,
  LoadProgress,
  GitHubRepoInfo,
  LocalUploadOptions,
} from "./types"

// Virtual File System
export { VirtualFileSystem } from "./virtual-fs"

// File Index
export {
  createFileIndex,
  indexFile,
  unindexFile,
  searchFiles,
  findImporters,
  findImports,
  findBySymbol,
  getFilesInFolder,
  getIndexStats,
} from "./file-index"

// Language Detection
export {
  getLanguage,
  getExtension,
  getMimeType,
  isBinaryFile,
  shouldIgnorePath,
  analyzeLanguages,
} from "./language-detector"

// Local Loader
export {
  loadFromDirectoryHandle,
  loadFromFileList,
  requestDirectoryAccess,
  isFileSystemAccessSupported,
} from "./local-loader"

// GitHub Loader
export {
  parseGitHubUrl,
  getDefaultBranch,
  getRepoInfo,
  getRepoBranches,
  getRepoTree,
  getFileContent,
  loadGitHubRepo,
  loadFileContent,
} from "./github-loader"

export type { GitBranchInfo } from "./github-loader"

// Patch Utils
export {
  createReplaceOperation,
  createPatch,
  generateLinePatches,
  validatePatch,
  applyOperation,
  applyPatch,
  createReversePatch,
  patchToUnifiedDiff,
} from "./patch-utils"

// History Manager
export { HistoryManager } from "./history-manager"
