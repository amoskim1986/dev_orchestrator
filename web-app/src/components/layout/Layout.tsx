import type { ReactNode } from 'react'
import { useState } from 'react'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  children: (activeTab: string) => ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [activeTab, setActiveTab] = useState('projects')

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex overflow-hidden">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        {children(activeTab)}
      </main>
    </div>
  )
}
