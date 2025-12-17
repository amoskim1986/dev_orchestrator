import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { MarkdownViewerPage } from './pages/markdown-viewer/MarkdownViewerPage'
import { useThemeStore } from './stores/themeStore'
import './index.css'

// Wrapper to apply theme class
function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeWrapper>
      <MarkdownViewerPage />
    </ThemeWrapper>
  </React.StrictMode>
)
