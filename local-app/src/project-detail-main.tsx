import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { initSupabase } from '@dev-orchestrator/shared'
import { ProjectDetailPage } from './pages/project-detail/ProjectDetailPage'
import { useThemeStore } from './stores/themeStore'
import './index.css'

// Initialize Supabase with environment variables
initSupabase({
  url: import.meta.env.VITE_SUPABASE_URL,
  key: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
});

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
      <ProjectDetailPage />
    </ThemeWrapper>
  </React.StrictMode>
)
