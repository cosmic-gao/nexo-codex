export interface EditorConfig {
  fontSize: number
  fontFamily: string
  tabSize: number
  wordWrap: "on" | "off" | "wordWrapColumn" | "bounded"
  minimap: boolean
  lineNumbers: "on" | "off" | "relative" | "interval"
  theme: string
}

export interface CursorPosition {
  line: number
  column: number
}

export type SupportedLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "cpp"
  | "c"
  | "html"
  | "css"
  | "json"
  | "markdown"
  | "plaintext"

export interface EditorSelection {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
}

export interface EditorState {
  cursorPosition: CursorPosition
  selection: EditorSelection | null
  scrollTop: number
  scrollLeft: number
}
