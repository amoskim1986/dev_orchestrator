import { ReactNode, useState } from 'react'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'

interface LayoutProps {
  children: (activeTab: string) => ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [activeTab, setActiveTab] = useState('history')

  return (
    <div className="h-screen bg-gray-900 text-gray-100 flex flex-col overflow-hidden">
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
