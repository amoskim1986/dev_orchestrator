interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: '~' },
  { id: 'history', label: 'History', icon: 'H' },
  { id: 'projects', label: 'Projects', icon: 'P' },
  { id: 'journeys', label: 'Journeys', icon: 'J' },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-48 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigation</h2>
      </div>
      <nav className="flex-1 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <span className="w-5 h-5 flex items-center justify-center text-xs font-mono bg-gray-600 rounded">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
