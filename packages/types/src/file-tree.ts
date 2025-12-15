/**
 * AI modification status for files
 */
export type AIStatus = 
  | "none"           // No AI activity
  | "pending"        // Queued for AI modification
  | "modifying"      // AI is currently modifying
  | "modified"       // AI has modified (unsaved)
  | "reviewing"      // User is reviewing AI changes

/**
 * File modification state
 */
export interface FileState {
  isDirty: boolean           // Has unsaved changes
  aiStatus: AIStatus         // AI modification status
  originalContent?: string   // Original content for diff
}

/**
 * File or folder node in the tree
 */
export interface FileNode {
  id: string
  name: string
  type: "file" | "folder"
  path: string               // Full path from root
  children?: FileNode[]
  content?: string
  language?: string
  state?: FileState
}

/**
 * Open tab in the editor
 */
export interface EditorTab {
  id: string
  fileId: string
  fileName: string
  filePath: string
  language: string
  content: string
  isDirty: boolean
  aiStatus: AIStatus
}

/**
 * File tree state management
 */
export interface FileTreeState {
  files: FileNode[]
  expandedFolders: Set<string>
}

/**
 * Editor workspace state
 */
export interface WorkspaceState {
  files: FileNode[]
  openTabs: EditorTab[]
  activeTabId: string | null
  expandedFolders: Set<string>
}
