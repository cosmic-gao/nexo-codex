export type {
  AIStatus,
  FileState,
  FileNode,
  EditorTab,
  FileTreeState,
  WorkspaceState,
} from "./file-tree"

export type {
  EditorConfig,
  CursorPosition,
  SupportedLanguage,
  EditorSelection,
  EditorState,
} from "./editor"

export type {
  DiffHunk,
  DiffLine,
  FileDiff,
  AIModification,
  AIModificationCategory,
  AIModificationStatus,
  AIModificationBatch,
} from "./diff"

export type {
  PatchOperation,
  PatchOperationType,
  Patch,
  PatchStatus,
  PatchResult,
  PatchError,
  HistoryEntry,
  PatchValidation,
  PatchConflict,
  PatchResolution,
  PatchBatch,
} from "./patch"
