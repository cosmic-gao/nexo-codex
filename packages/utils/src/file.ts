/**
 * Get file extension from language name
 */
export function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    typescript: "ts",
    javascript: "js",
    python: "py",
    rust: "rs",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    html: "html",
    css: "css",
    json: "json",
    markdown: "md",
    plaintext: "txt",
  }
  return extensions[language] || "txt"
}

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || ""
  const languages: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    json: "json",
    md: "markdown",
    txt: "plaintext",
  }
  return languages[ext] || "plaintext"
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

