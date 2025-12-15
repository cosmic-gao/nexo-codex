/**
 * Language detection based on file extension
 */

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  
  // Web
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  vue: "vue",
  svelte: "svelte",
  
  // Data
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  toml: "toml",
  
  // Python
  py: "python",
  pyw: "python",
  pyi: "python",
  
  // Rust
  rs: "rust",
  
  // Go
  go: "go",
  
  // Java/Kotlin
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  
  // C/C++
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hxx: "cpp",
  
  // C#
  cs: "csharp",
  
  // Ruby
  rb: "ruby",
  
  // PHP
  php: "php",
  
  // Swift
  swift: "swift",
  
  // Shell
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  ps1: "powershell",
  
  // Config
  env: "dotenv",
  gitignore: "gitignore",
  dockerignore: "dockerignore",
  editorconfig: "editorconfig",
  
  // Documentation
  md: "markdown",
  mdx: "markdown",
  rst: "restructuredtext",
  txt: "plaintext",
  
  // SQL
  sql: "sql",
  
  // GraphQL
  graphql: "graphql",
  gql: "graphql",
  
  // Docker
  dockerfile: "dockerfile",
  
  // Misc
  lock: "lock",
  log: "log",
}

const FILENAME_LANGUAGE_MAP: Record<string, string> = {
  dockerfile: "dockerfile",
  makefile: "makefile",
  cmakelists: "cmake",
  gemfile: "ruby",
  rakefile: "ruby",
  jenkinsfile: "groovy",
  vagrantfile: "ruby",
}

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "bmp", "ico", "webp", "svg",
  "mp3", "wav", "ogg", "flac", "aac",
  "mp4", "avi", "mkv", "mov", "webm",
  "zip", "tar", "gz", "rar", "7z",
  "exe", "dll", "so", "dylib",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "ttf", "otf", "woff", "woff2", "eot",
  "bin", "dat", "db", "sqlite",
])

const IGNORED_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^\.svn\//,
  /^\.hg\//,
  /^dist\//,
  /^build\//,
  /^out\//,
  /^\.next\//,
  /^\.nuxt\//,
  /^__pycache__\//,
  /^\.pytest_cache\//,
  /^\.mypy_cache\//,
  /^\.venv\//,
  /^venv\//,
  /^\.idea\//,
  /^\.vscode\//,
  /^coverage\//,
  /^\.nyc_output\//,
  /^target\//,       // Rust/Java
  /^vendor\//,       // Go/PHP
  /^Pods\//,         // iOS
]

export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".")
  if (lastDot === -1 || lastDot === 0) return ""
  return filename.slice(lastDot + 1).toLowerCase()
}

export function getLanguage(filename: string): string {
  const lowerName = filename.toLowerCase()
  
  // Check exact filename matches first
  const baseNameMatch = FILENAME_LANGUAGE_MAP[lowerName]
  if (baseNameMatch) return baseNameMatch
  
  // Check extension
  const ext = getExtension(filename)
  return EXTENSION_LANGUAGE_MAP[ext] ?? "plaintext"
}

export function isBinaryFile(filename: string): boolean {
  const ext = getExtension(filename)
  return BINARY_EXTENSIONS.has(ext)
}

export function shouldIgnorePath(path: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => pattern.test(path))
}

export function getMimeType(filename: string): string {
  const ext = getExtension(filename)
  
  const mimeTypes: Record<string, string> = {
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
    ts: "text/typescript",
    json: "application/json",
    xml: "application/xml",
    md: "text/markdown",
    txt: "text/plain",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  }
  
  return mimeTypes[ext] ?? "application/octet-stream"
}

/**
 * Estimate language distribution for a list of files
 */
export function analyzeLanguages(files: { path: string }[]): Record<string, number> {
  const counts: Record<string, number> = {}
  
  for (const file of files) {
    const lang = getLanguage(file.path.split("/").pop() ?? "")
    if (lang !== "plaintext") {
      counts[lang] = (counts[lang] ?? 0) + 1
    }
  }
  
  return counts
}

