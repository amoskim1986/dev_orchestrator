export type JourneyTab = 'overview' | 'intake' | 'spec' | 'plan' | 'checklists' | 'links'

interface TabConfig {
  id: JourneyTab
  label: string
  badge?: string | number
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'intake', label: 'Intake' },
  { id: 'spec', label: 'Spec' },
  { id: 'plan', label: 'Plan' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'links', label: 'Links' },
]

interface TabNavigationProps {
  activeTab: JourneyTab
  onTabChange: (tab: JourneyTab) => void
  badges?: Partial<Record<JourneyTab, string | number>>
}

export function TabNavigation({ activeTab, onTabChange, badges = {} }: TabNavigationProps) {
  return (
    <div className="flex border-b border-gray-700 overflow-x-auto">
      {TABS.map((tab) => {
        const badge = badges[tab.id]
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
            {badge !== undefined && (
              <span className="ml-1.5 text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
