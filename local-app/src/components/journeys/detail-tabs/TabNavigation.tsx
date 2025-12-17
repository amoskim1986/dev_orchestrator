import type { JourneyType } from '@dev-orchestrator/shared'

export type JourneyTab = 'overview' | 'intake' | 'spec' | 'plan' | 'checklists' | 'links'

interface TabConfig {
  id: JourneyTab
  label: string
  badge?: string | number
  hiddenForTypes?: JourneyType[]
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'intake', label: 'Intake' },
  { id: 'spec', label: 'Spec' },
  { id: 'plan', label: 'Plan' },
  { id: 'checklists', label: 'Checklists', hiddenForTypes: ['feature_planning'] },
  { id: 'links', label: 'Links' },
]

interface TabNavigationProps {
  activeTab: JourneyTab
  onTabChange: (tab: JourneyTab) => void
  badges?: Partial<Record<JourneyTab, string | number>>
  journeyType?: JourneyType
}

export function TabNavigation({ activeTab, onTabChange, badges = {}, journeyType }: TabNavigationProps) {
  // Filter tabs based on journey type
  const visibleTabs = TABS.filter(tab => {
    if (!tab.hiddenForTypes || !journeyType) return true
    return !tab.hiddenForTypes.includes(journeyType)
  })

  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {visibleTabs.map((tab) => {
        const badge = badges[tab.id]
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-500 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
            {badge !== undefined && (
              <span className="ml-1.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
