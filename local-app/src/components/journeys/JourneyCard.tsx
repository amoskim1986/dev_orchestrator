import type { Journey, JourneyStage } from '../../types'
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
  onOpenInVSCode?: () => void
}

export function JourneyCard({ journey, onUpdateStage, onStart, onDelete, onClick, onOpenInVSCode }: JourneyCardProps) {
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
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-gray-600 transition-colors shadow-sm ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Main row layout */}
      <div className="flex items-center gap-4">
        {/* Left: Name, badges, description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {journey.name}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <TypeBadge type={journey.type} size="sm" />
              <StageBadge stage={journey.stage} type={journey.type} size="sm" />
            </div>
          </div>

          {/* Description and branch on same row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {journey.description && (
              <span className="truncate max-w-md">{journey.description}</span>
            )}
            {isStarted && journey.branch_name && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 16 16">
                  <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                </svg>
                <span className="text-gray-600 dark:text-gray-300 font-mono truncate max-w-[200px]" title={journey.branch_name}>
                  {journey.branch_name}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {journey.tags && journey.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {journey.tags.slice(0, 5).map((tag, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  {tag}
                </span>
              ))}
              {journey.tags.length > 5 && (
                <span className="text-[10px] text-gray-500">+{journey.tags.length - 5}</span>
              )}
            </div>
          )}
        </div>

        {/* Center: Progress bar */}
        <div className="w-48 flex-shrink-0">
          <StageProgress stage={journey.stage} type={journey.type} />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {/* Start button for intake/reported stages */}
          {(journey.stage === 'intake' || journey.stage === 'reported') && !isStarted && (
            <Button size="sm" onClick={onStart}>
              Start
            </Button>
          )}

          {/* VS Code button (only when started) */}
          {isStarted && onOpenInVSCode && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onOpenInVSCode()
              }}
              title="Open in VS Code with Claude"
            >
              <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.583 2.167L11.5 8.25l-3.583-3.5L.833 9.333v5.334l7.084 4.583 3.583-3.5 6.083 6.083 6.584-4.25V6.417l-6.584-4.25zm-.916 14.5l-4.584-4.584 4.584-4.583v9.167z"/>
              </svg>
              VS Code
            </Button>
          )}

          {/* Next stage button */}
          {nextStage && !isComplete && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onUpdateStage(nextStage as JourneyStage)}
            >
              {formatStageLabel(nextStage)}
            </Button>
          )}

          {/* Complete indicator */}
          {isComplete && (
            <span className="text-xs text-green-400 flex items-center gap-1 px-2">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Complete
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
            title="Delete journey"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
