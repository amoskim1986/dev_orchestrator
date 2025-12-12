import type { Journey, JourneyStage, JourneyType } from '../../types'
import { JourneyCard } from './JourneyCard'

interface JourneyListProps {
  journeys: Journey[]
  onUpdateStage: (id: string, stage: JourneyStage) => void
  onStart: (journey: Journey) => void
  onDelete: (id: string) => void
  onSelectJourney?: (journey: Journey) => void
}

// Group journeys by type
const typeOrder: JourneyType[] = ['feature_planning', 'feature', 'bug', 'investigation']

const typeLabels: Record<JourneyType, string> = {
  feature_planning: 'Feature Planning',
  feature: 'Feature Implementation',
  bug: 'Bug Fixes',
  investigation: 'Investigations',
}

const typeIcons: Record<JourneyType, string> = {
  feature_planning: '📋',
  feature: '✨',
  bug: '🐛',
  investigation: '🔍',
}

export function JourneyList({ journeys, onUpdateStage, onStart, onDelete, onSelectJourney }: JourneyListProps) {
  // Group journeys by type
  const journeysByType = typeOrder.reduce((acc, type) => {
    acc[type] = journeys.filter(j => j.type === type)
    return acc
  }, {} as Record<JourneyType, Journey[]>)

  // Check if there are any journeys
  const hasJourneys = journeys.length > 0

  if (!hasJourneys) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-2">No journeys yet</p>
          <p className="text-sm text-gray-500">Create a journey to get started</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto space-y-6 pr-2">
      {typeOrder.map(type => {
        const typeJourneys = journeysByType[type]
        if (typeJourneys.length === 0) return null

        return (
          <div key={type}>
            {/* Type Header */}
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-gray-900 py-2 z-10">
              <span className="text-lg">{typeIcons[type]}</span>
              <h2 className="text-sm font-medium text-gray-300">{typeLabels[type]}</h2>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                {typeJourneys.length}
              </span>
            </div>

            {/* Journey Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {typeJourneys.map(journey => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  onUpdateStage={(stage) => onUpdateStage(journey.id, stage)}
                  onStart={() => onStart(journey)}
                  onDelete={() => onDelete(journey.id)}
                  onClick={onSelectJourney ? () => onSelectJourney(journey) : undefined}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
