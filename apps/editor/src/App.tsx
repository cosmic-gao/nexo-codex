import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { CodeEditor, type CursorPosition } from "@/components/code-editor"
import { EditorHeader } from "@/components/editor-header"
import { EditorFooter, type GitBranch } from "@/components/editor-footer"
import { EditorTabs } from "@/components/editor-tabs"
import { FileTree } from "@/components/file-tree"
import { WelcomeScreen } from "@/components/welcome-screen"
import { RepoLoaderDialog } from "@/components/repo-loader"
import { AIReviewPanel } from "@/components/diff-viewer"
import { useWorkspace } from "@/hooks/use-workspace"
import { useVirtualFS } from "@/hooks/use-virtual-fs"
import { useAIReview } from "@/hooks/use-ai-review"
import { sampleFiles } from "@/data/sample-files"
import { downloadFile, copyToClipboard, getFileExtension } from "@nexo/utils"
import type { FileNode } from "@nexo/types"
import { cn, Button, TooltipProvider } from "@nexo/ui"
import { Sparkles } from "lucide-react"

const AI_PANEL_MIN_WIDTH = 320
const AI_PANEL_MAX_WIDTH = 800
const AI_PANEL_DEFAULT_WIDTH = 420

function App() {
  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false)
  const [aiPanelWidth, setAiPanelWidth] = useState(AI_PANEL_DEFAULT_WIDTH)
  const [isResizingAiPanel, setIsResizingAiPanel] = useState(false)
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ line: 1, column: 1 })
  const aiPanelRef = useRef<HTMLDivElement>(null)

  // Handle AI panel resize
  useEffect(() => {
    if (!isResizingAiPanel) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      setAiPanelWidth(Math.min(AI_PANEL_MAX_WIDTH, Math.max(AI_PANEL_MIN_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizingAiPanel(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizingAiPanel])

  const handleAiPanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingAiPanel(true)
  }, [])

  const {
    isLoaded: isRepoLoaded,
    progress,
    repoName,
    fileTree: vfsFileTree,
    branches: vfsBranches,
    currentBranch: vfsCurrentBranch,
    isLoadingBranches,
    loadLocal,
    loadGitHub,
    switchBranch: vfsSwitchBranch,
    refreshBranches,
  } = useVirtualFS()

  const {
    modifications,
    isReviewPanelOpen,
    pendingCount,
    setIsReviewPanelOpen,
    loadSampleModifications,
    validateModification,
    acceptModification,
    rejectModification,
    revertModification,
    acceptAll,
    rejectAll,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAIReview()

  // Convert VFS branches to EditorFooter format
  const branches: GitBranch[] = useMemo(() => {
    if (!isRepoLoaded || vfsBranches.length === 0) {
      // Default demo branches when no repo is loaded
      return [
        { name: "main", isCurrent: true },
      ]
    }
    
    return vfsBranches.map(b => ({
      name: b.name,
      isCurrent: b.name === vfsCurrentBranch,
      isRemote: b.isRemote,
    }))
  }, [isRepoLoaded, vfsBranches, vfsCurrentBranch])

  const currentBranch = isRepoLoaded ? vfsCurrentBranch : "main"

  // Handle branch switch
  const handleBranchChange = useCallback((branchName: string) => {
    if (isRepoLoaded) {
      vfsSwitchBranch(branchName)
    }
  }, [isRepoLoaded, vfsSwitchBranch])

  const currentFiles = isRepoLoaded ? vfsFileTree : sampleFiles

  const {
    openTabs,
    activeTabId,
    activeTab,
    openFile,
    closeTab,
    setActiveTabId,
    updateTabContent,
    saveTab,
  } = useWorkspace({ initialFiles: currentFiles })

  const language = activeTab?.language ?? "typescript"

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (activeTabId) saveTab(activeTabId)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        e.preventDefault()
        if (activeTabId) closeTab(activeTabId)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault()
        setIsRepoDialogOpen(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey && isReviewPanelOpen) {
        e.preventDefault()
        undo()
      }
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") || 
          ((e.ctrlKey || e.metaKey) && e.key === "y")) {
        if (isReviewPanelOpen) {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeTabId, saveTab, closeTab, isReviewPanelOpen, undo, redo])

  const handleFileSelect = useCallback((node: FileNode) => {
    openFile(node)
  }, [openFile])

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (activeTabId) updateTabContent(activeTabId, value ?? "")
  }, [activeTabId, updateTabContent])

  const handleCursorPositionChange = useCallback((position: CursorPosition) => {
    setCursorPosition(position)
  }, [])

  const handleRun = useCallback(() => {
    if (activeTab) console.log("Running:", activeTab.content)
  }, [activeTab])

  const handleCopy = useCallback(async () => {
    if (activeTab) {
      await copyToClipboard(activeTab.content)
    }
  }, [activeTab])

  const handleDownload = useCallback(() => {
    if (activeTab) {
      const ext = getFileExtension(activeTab.language)
      downloadFile(activeTab.content, activeTab.fileName ?? `code.${ext}`)
    }
  }, [activeTab])

  const handleLoadLocal = useCallback(async (
    entries: Array<{ path: string; file: File }>,
    name: string
  ) => {
    console.log("[App] handleLoadLocal called:", entries.length, "entries, name:", name)
    await loadLocal(entries, name)
    console.log("[App] handleLoadLocal complete")
  }, [loadLocal])

  const handleLoadGitHub = useCallback(async (info: Parameters<typeof loadGitHub>[0]) => {
    console.log("[App] handleLoadGitHub called:", info)
    await loadGitHub(info)
    console.log("[App] handleLoadGitHub complete")
  }, [loadGitHub])

  useEffect(() => {
    if (progress?.phase === "complete") {
      const timer = setTimeout(() => setIsRepoDialogOpen(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [progress?.phase])

  console.log("[App] Render, isRepoDialogOpen:", isRepoDialogOpen)

  return (
    <TooltipProvider>
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <EditorHeader
        repoName={isRepoLoaded ? repoName : undefined}
        onRun={handleRun}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onOpenRepo={() => {
          console.log("[App] onOpenRepo clicked!")
          setIsRepoDialogOpen(true)
        }}
        onSearch={() => console.log("Search")}
      />

      <div className="relative flex flex-1 overflow-hidden">
        <FileTree
          files={currentFiles}
          activeFileId={activeTab?.fileId ?? null}
          onFileSelect={handleFileSelect}
          onRefresh={() => console.log("Refresh")}
          onNewFile={() => console.log("New file")}
          onNewFolder={() => console.log("New folder")}
          projectName={isRepoLoaded ? repoName : "demo-project"}
        />

        <div 
          className={cn(
            "flex flex-1 flex-col overflow-hidden",
            !isResizingAiPanel && "transition-[margin] duration-200"
          )}
          style={{ marginRight: isReviewPanelOpen ? aiPanelWidth : 0 }}
        >
          <EditorTabs
            tabs={openTabs}
            activeTabId={activeTabId}
            onTabSelect={setActiveTabId}
            onTabClose={closeTab}
          />

          <main className="flex-1 overflow-hidden p-3">
            {activeTab ? (
              <CodeEditor
                key={activeTab.id}
                defaultValue={activeTab.content}
                language={activeTab.language}
                onChange={handleCodeChange}
                onCursorPositionChange={handleCursorPositionChange}
              />
            ) : (
              <WelcomeScreen onOpenRepo={() => setIsRepoDialogOpen(true)} />
            )}
          </main>
        </div>

        <div
          ref={aiPanelRef}
          style={{ 
            width: aiPanelWidth,
            position: "fixed",
            right: 0,
            top: 48,
            bottom: 24,
            overflow: "hidden",
            borderLeft: "1px solid #e5e7eb",
            backgroundColor: "#ffffff",
            transform: isReviewPanelOpen ? "translateX(0)" : "translateX(100%)",
            transition: !isResizingAiPanel ? "transform 0.2s ease" : "none",
            zIndex: 30,
          }}
        >
          {/* Resize handle */}
          <div
            onMouseDown={handleAiPanelResizeStart}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              cursor: "col-resize",
              zIndex: 10,
              backgroundColor: isResizingAiPanel ? "rgba(45, 140, 130, 0.5)" : "transparent",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isResizingAiPanel) {
                e.currentTarget.style.backgroundColor = "rgba(45, 140, 130, 0.3)"
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizingAiPanel) {
                e.currentTarget.style.backgroundColor = "transparent"
              }
            }}
          />
          <AIReviewPanel
            modifications={modifications}
            onAccept={acceptModification}
            onReject={rejectModification}
            onRevert={revertModification}
            onAcceptAll={acceptAll}
            onRejectAll={rejectAll}
            onUndo={undo}
            onRedo={redo}
            onValidate={validateModification}
            onClose={() => setIsReviewPanelOpen(false)}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>
      </div>

      <EditorFooter 
        language={language} 
        cursorPosition={cursorPosition}
        branchName={currentBranch}
        branches={branches}
        onBranchChange={handleBranchChange}
        onRefreshBranches={isRepoLoaded ? refreshBranches : undefined}
        isLoadingBranches={isLoadingBranches}
      />

      <RepoLoaderDialog
        isOpen={isRepoDialogOpen}
        onClose={() => setIsRepoDialogOpen(false)}
        onLoadLocal={handleLoadLocal}
        onLoadGitHub={handleLoadGitHub}
        progress={progress}
      />

      {/* AI Review Button - hidden when panel is open */}
      {!isReviewPanelOpen && (
        <button
          onClick={loadSampleModifications}
          style={{
            position: "fixed",
            bottom: 36,
            right: 12,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            color: "#374151",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)"
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)"
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)"
          }}
        >
          <Sparkles style={{ width: 14, height: 14, color: "#2d8c82" }} />
          AI Review
          {modifications.length > 0 && (
            <span 
              style={{ 
                marginLeft: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                borderRadius: 9,
                backgroundColor: "#2d8c82",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {modifications.length}
            </span>
          )}
        </button>
      )}
    </div>
    </TooltipProvider>
  )
}

export default App
