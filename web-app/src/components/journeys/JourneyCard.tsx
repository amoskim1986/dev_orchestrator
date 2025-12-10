import type { Journey, JourneyStatus } from '../../types'
import { StatusBadge } from './StatusBadge'
import { Button } from '../common/Button'

interface JourneyCardProps {
  journey: Journey
  onUpdateStatus: (status: JourneyStatus) => void
  onStart: () => void
  onDelete: () => void
}

export function JourneyCard({ journey, onUpdateStatus, onStart, onDelete }: JourneyCardProps) {
  const isStarted = journey.branch_name !== null

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-white text-sm truncate flex-1">
          {journey.name}
        </h3>
        <StatusBadge status={journey.status} size="sm" />
      </div>

      {/* Description */}
      {journey.description && (
        <p className="text-xs text-gray-400 mb-2 line-clamp-2">
          {journey.description}
        </p>
      )}

      {/* Branch info (only if started) */}
      {isStarted && (
        <div className="text-xs text-gray-500 mb-2 font-mono">
          <span className="text-gray-600">branch:</span> {journey.branch_name}
        </div>
      )}

      {/* Server status */}
      {(journey.rails_port || journey.react_port) && (
        <div className="flex gap-3 text-xs mb-2">
          {journey.rails_port && (
            <span className="text-gray-400">
              <span className={journey.rails_pid ? 'text-green-400' : 'text-gray-600'}>●</span>
              {' '}Rails :{journey.rails_port}
            </span>
          )}
          {journey.react_port && (
            <span className="text-gray-400">
              <span className={journey.react_pid ? 'text-green-400' : 'text-gray-600'}>●</span>
              {' '}React :{journey.react_port}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-gray-700">
        <div className="flex gap-1">
          {journey.status === 'planning' && !isStarted && (
            <Button size="sm" onClick={onStart}>
              Start
            </Button>
          )}
          {journey.status === 'in_progress' && (
            <Button size="sm" variant="secondary" onClick={() => onUpdateStatus('ready')}>
              Mark Ready
            </Button>
          )}
          {journey.status === 'ready' && (
            <Button size="sm" variant="secondary" onClick={() => onUpdateStatus('deployed')}>
              Mark Deployed
            </Button>
          )}
        </div>

        <button
          onClick={onDelete}
          className="text-gray-500 hover:text-red-400 transition-colors p-1"
          title="Delete journey"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}
