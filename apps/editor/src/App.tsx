import { useState, useCallback, useEffect, useRef } from "react"
import { CodeEditor } from "@/components/code-editor"
import { EditorHeader } from "@/components/editor-header"
import { EditorFooter } from "@/components/editor-footer"
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
    loadLocal,
    loadGitHub,
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
        cursorPosition={{ line: 1, column: 1 }}
      />

      <RepoLoaderDialog
        isOpen={isRepoDialogOpen}
        onClose={() => setIsRepoDialogOpen(false)}
        onLoadLocal={handleLoadLocal}
        onLoadGitHub={handleLoadGitHub}
        progress={progress}
      />

      {/* AI Review Button */}
      <Button
        onClick={loadSampleModifications}
        size="sm"
        variant="secondary"
        className="fixed bottom-9 right-3 z-40 gap-1.5 shadow-md"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI Review
        {pendingCount > 0 && (
          <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {pendingCount}
          </span>
        )}
      </Button>
    </div>
    </TooltipProvider>
  )
}

export default App
