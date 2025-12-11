import type { Journey, JourneyStatus } from '../../types'
import { JourneyCard } from './JourneyCard'

interface JourneyBoardProps {
  journeys: Journey[]
  onUpdateStatus: (id: string, status: JourneyStatus) => void
  onStart: (journey: Journey) => void
  onDelete: (id: string) => void
}

const columns: { status: JourneyStatus; title: string; color: string }[] = [
  { status: 'planning', title: 'Planning', color: 'border-gray-500' },
  { status: 'in_progress', title: 'In Progress', color: 'border-yellow-500' },
  { status: 'ready', title: 'Ready', color: 'border-green-500' },
  { status: 'deployed', title: 'Deployed', color: 'border-blue-500' },
]

export function JourneyBoard({ journeys, onUpdateStatus, onStart, onDelete }: JourneyBoardProps) {
  const getJourneysByStatus = (status: JourneyStatus) =>
    journeys.filter((j) => j.status === status)

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnJourneys = getJourneysByStatus(column.status)

        return (
          <div
            key={column.status}
            className={`flex-shrink-0 w-72 flex flex-col border-t-2 ${column.color}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between py-2 px-1">
              <h3 className="text-sm font-medium text-gray-300">{column.title}</h3>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                {columnJourneys.length}
              </span>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {columnJourneys.length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-sm">
                  No journeys
                </div>
              ) : (
                columnJourneys.map((journey) => (
                  <JourneyCard
                    key={journey.id}
                    journey={journey}
                    onUpdateStatus={(status) => onUpdateStatus(journey.id, status)}
                    onStart={() => onStart(journey)}
                    onDelete={() => onDelete(journey.id)}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
