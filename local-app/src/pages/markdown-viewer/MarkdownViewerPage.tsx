import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownViewerData {
  title: string
  content: string
  journeyId?: string
}

export function MarkdownViewerPage() {
  const [data, setData] = useState<MarkdownViewerData | null>(null)

  useEffect(() => {
    // Listen for init
    window.electronAPI.markdownViewer.onInit((receivedData) => {
      setData(receivedData)
      document.title = receivedData.title
    })

    // Listen for updates
    window.electronAPI.markdownViewer.onUpdate((receivedData) => {
      setData(receivedData)
      document.title = receivedData.title
    })
  }, [])

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Title bar area for macOS dragging */}
      <div className="h-7 bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 app-drag">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          {data.title}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="prose dark:prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {data.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
