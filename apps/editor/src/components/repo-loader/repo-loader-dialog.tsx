import { useState, useRef, useCallback } from "react"
import { 
  FolderOpen, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Upload,
  Link2,
  Key,
  Sparkles
} from "lucide-react"

// GitHub icon from Simple Icons (more refined version)
function GitHubIcon({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="currentColor"
      style={{ width: 16, height: 16, ...style }}
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
} from "@nexo/ui"
import type { LoadProgress, GitHubRepoInfo } from "@nexo/vfs"
import { 
  parseGitHubUrl, 
  loadFromFileList,
  isFileSystemAccessSupported,
  requestDirectoryAccess,
  loadFromDirectoryHandle
} from "@nexo/vfs"

interface RepoLoaderDialogProps {
  isOpen: boolean
  onClose: () => void
  onLoadLocal: (entries: Array<{ path: string; file: File }>, name: string) => void
  onLoadGitHub: (info: GitHubRepoInfo) => void
  progress: LoadProgress | null
}

export function RepoLoaderDialog({
  isOpen,
  onClose,
  onLoadLocal,
  onLoadGitHub,
  progress,
}: RepoLoaderDialogProps) {
  const [githubUrl, setGithubUrl] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<"local" | "github">("local")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isLoading = !!(progress && progress.phase !== "complete" && progress.phase !== "error")

  const handleFileSelect = useCallback(async (fileList: FileList) => {
    setError(null)
    const entries = loadFromFileList(fileList)
    if (entries.length === 0) {
      setError("No valid files found")
      return
    }
    const firstPath = entries[0].path
    const folderName = firstPath.split("/")[0] || "project"
    onLoadLocal(entries, folderName)
  }, [onLoadLocal])

  const handleDirectoryPick = useCallback(async () => {
    setError(null)
    
    if (isFileSystemAccessSupported()) {
      try {
        const handle = await requestDirectoryAccess()
        if (handle) {
          const entries = await loadFromDirectoryHandle(handle)
          if (entries.length === 0) {
            setError("No valid files found")
            return
          }
          onLoadLocal(entries, handle.name)
        }
      } catch (err) {
        setError((err as Error).message)
      }
    } else {
      fileInputRef.current?.click()
    }
  }, [onLoadLocal])

  const handleGitHubLoad = useCallback(() => {
    setError(null)
    const info = parseGitHubUrl(githubUrl)
    if (!info) {
      setError("Invalid GitHub URL or format. Use: owner/repo")
      return
    }
    if (githubToken) info.token = githubToken
    onLoadGitHub(info)
  }, [githubUrl, githubToken, onLoadGitHub])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError(null)
    
    const items = e.dataTransfer.items
    if (!items || items.length === 0) return
    
    const firstItem = items[0]
    if (firstItem.kind === "file") {
      const getHandle = (firstItem as DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle> }).getAsFileSystemHandle
      const handle = await getHandle?.()
      if (handle && handle.kind === "directory") {
        const entries = await loadFromDirectoryHandle(handle as FileSystemDirectoryHandle)
        if (entries.length > 0) {
          onLoadLocal(entries, handle.name)
          return
        }
      }
    }
    
    const files = e.dataTransfer.files
    if (files.length > 0) handleFileSelect(files)
  }, [handleFileSelect, onLoadLocal])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent style={{ padding: 0 }}>
        {/* Header */}
        <div 
          style={{ 
            padding: "24px 24px 20px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div 
              style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 14, 
                background: "linear-gradient(135deg, #2d8c82 0%, #3ba89c 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(45, 140, 130, 0.25)",
              }}
            >
              <Sparkles style={{ width: 24, height: 24, color: "#ffffff" }} />
            </div>
            <div style={{ flex: 1 }}>
              <DialogTitle style={{ fontSize: 20, fontWeight: 600, color: "#111827", marginBottom: 4, lineHeight: 1.2 }}>
                Open Project
              </DialogTitle>
              <DialogDescription style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.4 }}>
                Import from your local machine or GitHub
              </DialogDescription>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div style={{ padding: "20px 24px 24px" }}>

        {/* Custom Tabs */}
        <div style={{ marginTop: 24 }}>
          {/* Tab List */}
          <div 
            style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: 4,
              padding: 4,
              backgroundColor: "#f3f4f6",
              borderRadius: 10,
            }}
          >
            <button
              onClick={() => setActiveTab("local")}
              disabled={isLoading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                fontSize: 14,
                fontWeight: 500,
                cursor: isLoading ? "not-allowed" : "pointer",
                backgroundColor: activeTab === "local" ? "#ffffff" : "transparent",
                color: activeTab === "local" ? "#1a1a1a" : "#6b7280",
                boxShadow: activeTab === "local" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s",
              }}
            >
              <FolderOpen style={{ width: 16, height: 16 }} />
              Local Folder
            </button>
            <button
              onClick={() => setActiveTab("github")}
              disabled={isLoading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                fontSize: 14,
                fontWeight: 500,
                cursor: isLoading ? "not-allowed" : "pointer",
                backgroundColor: activeTab === "github" ? "#ffffff" : "transparent",
                color: activeTab === "github" ? "#1a1a1a" : "#6b7280",
                boxShadow: activeTab === "github" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.2s",
              }}
            >
              <GitHubIcon style={{ width: 16, height: 16 }} />
              GitHub
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ marginTop: 20 }}>
            {/* Local Tab */}
            {activeTab === "local" && (
              <div>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleDirectoryPick}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 40,
                    borderRadius: 12,
                    border: `2px dashed ${isDragging ? "#2d8c82" : "#e5e7eb"}`,
                    backgroundColor: isDragging ? "rgba(45, 140, 130, 0.05)" : "#fafafa",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.borderColor = "rgba(45, 140, 130, 0.5)"
                      e.currentTarget.style.backgroundColor = "#f9fafb"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDragging) {
                      e.currentTarget.style.borderColor = "#e5e7eb"
                      e.currentTarget.style.backgroundColor = "#fafafa"
                    }
                  }}
                >
                  <div 
                    style={{ 
                      width: 64, 
                      height: 64, 
                      borderRadius: 16, 
                      backgroundColor: isDragging ? "rgba(45, 140, 130, 0.1)" : "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s",
                    }}
                  >
                    <Upload 
                      style={{ 
                        width: 28, 
                        height: 28, 
                        color: isDragging ? "#2d8c82" : "#9ca3af",
                        transition: "color 0.2s",
                      }} 
                    />
                  </div>
                  <p style={{ marginTop: 16, fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>
                    Drop folder here or click to browse
                  </p>
                  <p style={{ marginTop: 6, fontSize: 13, color: "#9ca3af" }}>
                    {isFileSystemAccessSupported() 
                      ? "Supports folders and project directories" 
                      : "Select a folder to import"}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  // @ts-expect-error webkitdirectory
                  webkitdirectory=""
                  directory=""
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                />
              </div>
            )}

            {/* GitHub Tab */}
            {activeTab === "github" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 6, 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    <Link2 style={{ width: 14, height: 14, color: "#6b7280" }} />
                    Repository
                  </label>
                  <input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="owner/repo or https://github.com/owner/repo"
                    disabled={isLoading}
                    style={{ 
                      width: "100%",
                      height: 44,
                      padding: "0 14px",
                      fontSize: 14,
                      backgroundColor: "#fafafa",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#2d8c82"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>

                <div>
                  <label 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 6, 
                      fontSize: 13, 
                      fontWeight: 500, 
                      color: "#374151",
                      marginBottom: 8,
                    }}
                  >
                    <Key style={{ width: 14, height: 14, color: "#6b7280" }} />
                    Access Token
                    <span style={{ fontSize: 12, fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    disabled={isLoading}
                    style={{ 
                      width: "100%",
                      height: 44,
                      padding: "0 14px",
                      fontSize: 14,
                      backgroundColor: "#fafafa",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#2d8c82"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>

                <button
                  onClick={handleGitHubLoad}
                  disabled={!githubUrl || isLoading}
                  style={{ 
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    height: 44,
                    marginTop: 4,
                    fontSize: 14,
                    fontWeight: 500,
                    border: "none",
                    borderRadius: 10,
                    cursor: !githubUrl || isLoading ? "not-allowed" : "pointer",
                    backgroundColor: githubUrl && !isLoading ? "#2d8c82" : "#e5e7eb",
                    color: githubUrl && !isLoading ? "#ffffff" : "#9ca3af",
                    transition: "all 0.2s",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                      Importing...
                    </>
                  ) : (
                    <>
                      <GitHubIcon style={{ width: 16, height: 16 }} />
                      Import Repository
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress */}
        {progress && (
          <div 
            style={{ 
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              backgroundColor: progress.phase === "complete" 
                ? "rgba(34, 197, 94, 0.05)" 
                : progress.phase === "error" 
                  ? "rgba(239, 68, 68, 0.05)" 
                  : "rgba(45, 140, 130, 0.05)",
              border: `1px solid ${
                progress.phase === "complete" 
                  ? "rgba(34, 197, 94, 0.2)" 
                  : progress.phase === "error" 
                    ? "rgba(239, 68, 68, 0.2)" 
                    : "rgba(45, 140, 130, 0.2)"
              }`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div 
                style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: progress.phase === "complete" 
                    ? "rgba(34, 197, 94, 0.1)" 
                    : progress.phase === "error" 
                      ? "rgba(239, 68, 68, 0.1)" 
                      : "rgba(45, 140, 130, 0.1)",
                }}
              >
                {progress.phase === "complete" ? (
                  <CheckCircle2 style={{ width: 16, height: 16, color: "#22c55e" }} />
                ) : progress.phase === "error" ? (
                  <AlertCircle style={{ width: 16, height: 16, color: "#ef4444" }} />
                ) : (
                  <Loader2 style={{ width: 16, height: 16, color: "#2d8c82", animation: "spin 1s linear infinite" }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ 
                    fontSize: 14, 
                    fontWeight: 500,
                    color: progress.phase === "complete" 
                      ? "#22c55e" 
                      : progress.phase === "error" 
                        ? "#ef4444" 
                        : "#2d8c82",
                  }}>
                    {progress.phase === "complete" ? "Import Complete!" : 
                     progress.phase === "error" ? "Import Failed" : "Importing..."}
                  </span>
                  {progress.total > 0 && (
                    <span style={{ fontSize: 12, color: "#6b7280" }}>
                      {progress.current} / {progress.total} files
                    </span>
                  )}
                </div>
                {progress.total > 0 && progress.phase !== "complete" && progress.phase !== "error" && (
                  <div 
                    style={{ 
                      marginTop: 8, 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: "rgba(45, 140, 130, 0.1)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{ 
                        height: "100%",
                        borderRadius: 3,
                        width: `${(progress.current / progress.total) * 100}%`,
                        backgroundColor: "#2d8c82",
                        transition: "width 0.3s ease-out",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div 
            style={{ 
              marginTop: 16,
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: 16,
              borderRadius: 12,
              backgroundColor: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <div 
              style={{ 
                width: 24, 
                height: 24, 
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                flexShrink: 0,
              }}
            >
              <AlertCircle style={{ width: 14, height: 14, color: "#ef4444" }} />
            </div>
            <p style={{ fontSize: 14, color: "#ef4444", margin: 0 }}>{error}</p>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
