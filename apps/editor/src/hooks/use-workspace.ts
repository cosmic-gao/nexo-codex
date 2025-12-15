import { useState, useCallback, useMemo } from "react"
import type { FileNode, EditorTab, AIStatus } from "@nexo/types"
import { getLanguageFromExtension } from "@nexo/utils"

interface UseWorkspaceOptions {
  initialFiles: FileNode[]
}

export function useWorkspace({ initialFiles }: UseWorkspaceOptions) {
  const [files, setFiles] = useState<FileNode[]>(initialFiles)
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["1", "1-3"]))

  // Get active tab
  const activeTab = useMemo(() => {
    return openTabs.find((tab) => tab.id === activeTabId) ?? null
  }, [openTabs, activeTabId])

  // Get active file
  const activeFile = useMemo(() => {
    if (!activeTab) return null
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.id === activeTab.fileId) return node
        if (node.children) {
          const found = findFile(node.children)
          if (found) return found
        }
      }
      return null
    }
    return findFile(files)
  }, [activeTab, files])

  // Open a file in a new tab or switch to existing tab
  const openFile = useCallback((node: FileNode) => {
    if (node.type !== "file") return

    // Check if already open
    const existingTab = openTabs.find((tab) => tab.fileId === node.id)
    if (existingTab) {
      setActiveTabId(existingTab.id)
      return
    }

    // Create new tab
    const newTab: EditorTab = {
      id: `tab-${node.id}-${Date.now()}`,
      fileId: node.id,
      fileName: node.name,
      filePath: node.path,
      language: node.language ?? getLanguageFromExtension(node.name),
      content: node.content ?? "",
      isDirty: false,
      aiStatus: node.state?.aiStatus ?? "none",
    }

    setOpenTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [openTabs])

  // Close a tab
  const closeTab = useCallback((tabId: string) => {
    setOpenTabs((prev) => {
      const index = prev.findIndex((tab) => tab.id === tabId)
      const newTabs = prev.filter((tab) => tab.id !== tabId)
      
      // If closing active tab, switch to adjacent tab
      if (tabId === activeTabId && newTabs.length > 0) {
        const newIndex = Math.min(index, newTabs.length - 1)
        setActiveTabId(newTabs[newIndex].id)
      } else if (newTabs.length === 0) {
        setActiveTabId(null)
      }
      
      return newTabs
    })
  }, [activeTabId])

  // Update tab content
  const updateTabContent = useCallback((tabId: string, content: string) => {
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? { ...tab, content, isDirty: true }
          : tab
      )
    )
  }, [])

  // Save tab (sync back to file)
  const saveTab = useCallback((tabId: string) => {
    const tab = openTabs.find((t) => t.id === tabId)
    if (!tab) return

    // Update file content
    const updateFileContent = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === tab.fileId) {
          return { ...node, content: tab.content }
        }
        if (node.children) {
          return { ...node, children: updateFileContent(node.children) }
        }
        return node
      })
    }

    setFiles(updateFileContent)
    setOpenTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, isDirty: false } : t
      )
    )
  }, [openTabs])

  // Update file AI status
  const setFileAIStatus = useCallback((fileId: string, status: AIStatus) => {
    const updateStatus = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === fileId) {
          return {
            ...node,
            state: { ...node.state, aiStatus: status, isDirty: node.state?.isDirty ?? false },
          }
        }
        if (node.children) {
          return { ...node, children: updateStatus(node.children) }
        }
        return node
      })
    }

    setFiles(updateStatus)
    
    // Also update open tab
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.fileId === fileId ? { ...tab, aiStatus: status } : tab
      )
    )
  }, [])

  // Simulate AI modifying a file
  const simulateAIModification = useCallback((fileId: string, newContent: string) => {
    // Set status to modifying
    setFileAIStatus(fileId, "modifying")

    // Simulate delay then complete
    setTimeout(() => {
      // Update file content
      const updateContent = (nodes: FileNode[]): FileNode[] => {
        return nodes.map((node) => {
          if (node.id === fileId) {
            return {
              ...node,
              content: newContent,
              state: { aiStatus: "modified" as const, isDirty: true, originalContent: node.content },
            }
          }
          if (node.children) {
            return { ...node, children: updateContent(node.children) }
          }
          return node
        })
      }

      setFiles(updateContent)

      // Update tab if open
      setOpenTabs((prev) =>
        prev.map((tab) =>
          tab.fileId === fileId
            ? { ...tab, content: newContent, isDirty: true, aiStatus: "modified" }
            : tab
        )
      )
    }, 2000)
  }, [setFileAIStatus])

  return {
    // State
    files,
    openTabs,
    activeTabId,
    activeTab,
    activeFile,
    expandedFolders,
    
    // Actions
    openFile,
    closeTab,
    setActiveTabId,
    updateTabContent,
    saveTab,
    setFileAIStatus,
    simulateAIModification,
    setExpandedFolders,
  }
}

