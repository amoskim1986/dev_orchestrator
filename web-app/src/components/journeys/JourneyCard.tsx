import type { Journey, JourneyStage } from '@dev-orchestrator/shared'
import { TypeBadge } from './TypeBadge'
import { StageBadge, StageProgress } from './StageBadge'
import { Button } from '../common/Button'
import { getStagesForType } from '@dev-orchestrator/shared'

interface JourneyCardProps {
  journey: Journey
  onUpdateStage: (stage: JourneyStage) => void
  onStart: () => void
  onDelete: () => void
  onClick?: () => void
}

export function JourneyCard({ journey, onUpdateStage, onStart, onDelete, onClick }: JourneyCardProps) {
  const isStarted = journey.branch_name !== null
  const stages = getStagesForType(journey.type)
  const currentStageIndex = stages.indexOf(journey.stage)
  const nextStage = currentStageIndex < stages.length - 1 ? stages[currentStageIndex + 1] : null
  const isComplete = currentStageIndex === stages.length - 1

  // Format stage label for button
  const formatStageLabel = (stage: string) => {
    return stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div
      className={`bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Header with type and stage */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white text-sm truncate">
            {journey.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <TypeBadge type={journey.type} size="sm" />
            <StageBadge stage={journey.stage} type={journey.type} size="sm" />
          </div>
        </div>
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

      {/* Tags */}
      {journey.tags && journey.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {journey.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">
              {tag}
            </span>
          ))}
          {journey.tags.length > 3 && (
            <span className="text-[10px] text-gray-500">+{journey.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <StageProgress stage={journey.stage} type={journey.type} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex gap-1 flex-wrap">
          {/* Start button for intake/reported stages */}
          {(journey.stage === 'intake' || journey.stage === 'reported') && !isStarted && (
            <Button size="sm" onClick={onStart}>
              Start
            </Button>
          )}

          {/* Next stage button */}
          {nextStage && !isComplete && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onUpdateStage(nextStage as JourneyStage)}
            >
              → {formatStageLabel(nextStage)}
            </Button>
          )}

          {/* Complete indicator */}
          {isComplete && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Complete
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
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
