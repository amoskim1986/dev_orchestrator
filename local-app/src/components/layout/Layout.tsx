import { ReactNode, useState, useEffect } from 'react'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { useThemeStore } from '../../stores/themeStore'

interface LayoutProps {
  children: (activeTab: string) => ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [activeTab, setActiveTab] = useState('journeys')
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="h-screen bg-slate-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex flex-col overflow-hidden">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-hidden">
          {children(activeTab)}
        </main>
      </div>
    </div>
  )
}
