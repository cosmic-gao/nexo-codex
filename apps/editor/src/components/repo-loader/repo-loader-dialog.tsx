import { useState, useRef, useCallback } from "react"
import { 
  FolderUp, 
  GithubIcon, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  HardDrive
} from "lucide-react"
import { 
  Button, 
  cn, 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  console.log("[RepoLoader] Render, isOpen:", isOpen, "progress:", progress?.phase)

  const isLoading = !!(progress && progress.phase !== "complete" && progress.phase !== "error")

  const handleFileSelect = useCallback(async (fileList: FileList) => {
    console.log("[RepoLoader] handleFileSelect:", fileList.length, "files")
    setError(null)
    const entries = loadFromFileList(fileList)
    console.log("[RepoLoader] loadFromFileList result:", entries.length, "entries")
    console.log("[RepoLoader] Sample paths:", entries.slice(0, 5).map(e => e.path))
    if (entries.length === 0) {
      setError("No valid files found")
      return
    }
    const firstPath = entries[0].path
    const folderName = firstPath.split("/")[0] || "project"
    console.log("[RepoLoader] Calling onLoadLocal with folderName:", folderName)
    onLoadLocal(entries, folderName)
  }, [onLoadLocal])

  const handleDirectoryPick = useCallback(async () => {
    console.log("[RepoLoader] handleDirectoryPick called")
    console.log("[RepoLoader] isFileSystemAccessSupported:", isFileSystemAccessSupported())
    setError(null)
    
    if (isFileSystemAccessSupported()) {
      console.log("[RepoLoader] Using File System Access API")
      try {
        const handle = await requestDirectoryAccess()
        console.log("[RepoLoader] requestDirectoryAccess returned:", handle)
        if (handle) {
          console.log("[RepoLoader] Got directory handle:", handle.name)
          const entries = await loadFromDirectoryHandle(handle)
          console.log("[RepoLoader] loadFromDirectoryHandle result:", entries.length, "entries")
          console.log("[RepoLoader] Sample paths:", entries.slice(0, 5).map(e => e.path))
          if (entries.length === 0) {
            setError("No valid files found")
            return
          }
          console.log("[RepoLoader] Calling onLoadLocal with handle.name:", handle.name)
          onLoadLocal(entries, handle.name)
        } else {
          console.log("[RepoLoader] User cancelled or no handle returned")
        }
      } catch (err) {
        console.error("[RepoLoader] Error in handleDirectoryPick:", err)
        setError((err as Error).message)
      }
    } else {
      console.log("[RepoLoader] Falling back to file input")
      fileInputRef.current?.click()
    }
  }, [onLoadLocal])

  const handleGitHubLoad = useCallback(() => {
    setError(null)
    const info = parseGitHubUrl(githubUrl)
    if (!info) {
      setError("Invalid GitHub URL")
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
      // getAsFileSystemHandle is part of File System Access API (not in standard TS types)
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

  // Debug: Alert when dialog should render
  if (isOpen) {
    console.log("[RepoLoader] Dialog should be visible now!")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" style={{ border: '3px solid red' }}>
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
          <DialogDescription>
            Load from local folder or GitHub
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="local" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="local" disabled={isLoading} className="flex-1 gap-2 text-xs">
              <HardDrive className="h-3.5 w-3.5" />
              Local
            </TabsTrigger>
            <TabsTrigger value="github" disabled={isLoading} className="flex-1 gap-2 text-xs">
              <GithubIcon className="h-3.5 w-3.5" />
              GitHub
            </TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="mt-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                console.log("[RepoLoader] Drop zone clicked!")
                handleDirectoryPick()
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
                isDragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
              )}
            >
              <FolderUp className="h-10 w-10 mb-3 text-muted-foreground" />
              <p className="text-sm text-foreground">Drop folder or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isFileSystemAccessSupported() ? "File System Access API" : "Folder picker"}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              // @ts-expect-error webkitdirectory
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
            />
          </TabsContent>

          <TabsContent value="github" className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Repository</label>
              <Input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="owner/repo"
                disabled={isLoading}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">
                Token <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_..."
                disabled={isLoading}
                className="h-8 text-sm"
              />
            </div>

            <Button
              onClick={handleGitHubLoad}
              disabled={!githubUrl || isLoading}
              className="w-full"
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load"
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Progress */}
        {progress && (
          <div className="mt-4 rounded-md border border-border p-3">
            <div className="flex items-center gap-2">
              {progress.phase === "complete" ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : progress.phase === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {progress.phase === "complete" ? "Done" : 
                     progress.phase === "error" ? "Error" : "Loading..."}
                  </span>
                  {progress.total > 0 && (
                    <span className="text-muted-foreground">
                      {progress.current}/{progress.total}
                    </span>
                  )}
                </div>
                {progress.total > 0 && (
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
