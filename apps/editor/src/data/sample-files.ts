import type { FileNode } from "@nexo/types"

export const sampleFiles: FileNode[] = [
  {
    id: "1",
    name: "src",
    type: "folder",
    path: "/src",
    children: [
      {
        id: "1-1",
        name: "index.ts",
        type: "file",
        path: "/src/index.ts",
        language: "typescript",
        content: `// Main entry point
import { App } from './app'

const app = new App()
app.start()

console.log('Application started!')
`,
      },
      {
        id: "1-2",
        name: "app.ts",
        type: "file",
        path: "/src/app.ts",
        language: "typescript",
        state: { isDirty: false, aiStatus: "modified" },
        content: `export class App {
  private name: string

  constructor() {
    this.name = 'Nexo Codex'
  }

  start() {
    console.log(\`Starting \${this.name}...\`)
    this.initialize()
  }

  // Added by AI: Initialize method
  private initialize() {
    console.log('Initializing application...')
    this.loadConfig()
  }

  // Added by AI: Load configuration
  private loadConfig() {
    console.log('Loading configuration...')
  }

  stop() {
    console.log(\`Stopping \${this.name}...\`)
  }
}
`,
      },
      {
        id: "1-3",
        name: "utils",
        type: "folder",
        path: "/src/utils",
        children: [
          {
            id: "1-3-1",
            name: "helpers.ts",
            type: "file",
            path: "/src/utils/helpers.ts",
            language: "typescript",
            state: { isDirty: false, aiStatus: "modifying" },
            content: `export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
`,
          },
          {
            id: "1-3-2",
            name: "constants.ts",
            type: "file",
            path: "/src/utils/constants.ts",
            language: "typescript",
            content: `export const API_URL = 'https://api.example.com'
export const MAX_RETRIES = 3
export const TIMEOUT_MS = 5000

export const COLORS = {
  primary: '#00d9ff',
  secondary: '#ff00ff',
  accent: '#00ff88',
} as const
`,
          },
        ],
      },
      {
        id: "1-4",
        name: "components",
        type: "folder",
        path: "/src/components",
        children: [
          {
            id: "1-4-1",
            name: "Button.tsx",
            type: "file",
            path: "/src/components/Button.tsx",
            language: "typescript",
            content: `import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  disabled?: boolean
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
`,
          },
          {
            id: "1-4-2",
            name: "Card.tsx",
            type: "file",
            path: "/src/components/Card.tsx",
            language: "typescript",
            content: `import React from 'react'

interface CardProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={\`card \${className}\`}>
      <h3 className="card-title">{title}</h3>
      <div className="card-content">
        {children}
      </div>
    </div>
  )
}
`,
          },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "config",
    type: "folder",
    path: "/config",
    children: [
      {
        id: "2-1",
        name: "settings.json",
        type: "file",
        path: "/config/settings.json",
        language: "json",
        content: `{
  "theme": "dark",
  "fontSize": 14,
  "tabSize": 2,
  "wordWrap": true,
  "minimap": true,
  "autoSave": true
}
`,
      },
      {
        id: "2-2",
        name: "vite.config.ts",
        type: "file",
        path: "/config/vite.config.ts",
        language: "typescript",
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
`,
      },
    ],
  },
  {
    id: "3",
    name: "README.md",
    type: "file",
    path: "/README.md",
    language: "markdown",
    content: `# Nexo Codex

A minimal online code editor built with React, Monaco Editor, and Tailwind CSS.

## Features

- 🎨 Beautiful dark theme with cyberpunk aesthetics
- 📁 File tree navigation with folder expand/collapse
- ✨ Syntax highlighting for multiple languages
- 🤖 AI modification tracking and status indicators
- 📑 Multi-tab editing support
- 🚀 Fast and responsive interface

## Getting Started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## AI Features

Files that are being modified or have been modified by AI are marked with special indicators:

- 🔄 **Modifying** - AI is currently working on this file
- ✨ **Modified** - AI has made changes (review recommended)
- ⏳ **Pending** - File is queued for AI modification

Enjoy coding! 🎉
`,
  },
  {
    id: "4",
    name: "package.json",
    type: "file",
    path: "/package.json",
    language: "json",
    content: `{
  "name": "my-project",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  }
}
`,
  },
  {
    id: "5",
    name: ".gitignore",
    type: "file",
    path: "/.gitignore",
    language: "plaintext",
    content: `# Dependencies
node_modules

# Build output
dist
build

# Environment
.env
.env.local

# IDE
.vscode
.idea

# OS
.DS_Store
Thumbs.db
`,
  },
]
