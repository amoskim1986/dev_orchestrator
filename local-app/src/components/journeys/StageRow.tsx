import type { JourneyType, JourneyStage } from '../../types'
import { getStagesForType } from '@dev-orchestrator/shared'

interface StageRowProps {
  type: JourneyType
  stage: JourneyStage
  onStageChange?: (stage: JourneyStage) => void
  size?: 'sm' | 'md'
  showNav?: boolean
}

// Shortened stage labels for compact display
const SHORT_LABELS: Record<string, string> = {
  intake: 'Intake',
  speccing: 'Spec',
  ui_planning: 'UI',
  planning: 'Plan',
  review: 'Review',
  approved: 'Approved',
  review_and_edit_plan: 'Review',
  implementing: 'Impl',
  testing: 'Test',
  pre_prod_review: 'Pre-Prod',
  merge_approved: 'Merged',
  staging_qa: 'QA',
  deployed: 'Deployed',
  in_progress: 'Active',
  complete: 'Done',
  reported: 'Reported',
  investigating: 'Invest',
  fixing: 'Fixing',
}

export function StageRow({ type, stage, onStageChange, size = 'md', showNav = true }: StageRowProps) {
  const stages = getStagesForType(type)
  const currentIndex = stages.indexOf(stage)
  const prevStage = currentIndex > 0 ? stages[currentIndex - 1] : null
  const nextStage = currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null

  const getShortLabel = (s: string) => SHORT_LABELS[s] || s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-xs px-2 py-1'

  const navButtonClasses = size === 'sm'
    ? 'p-0.5'
    : 'p-1'

  return (
    <div className="flex items-center gap-2">
      {/* Stage tags */}
      <div className="flex items-center gap-1 flex-wrap flex-1">
        {stages.map((s, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = s === stage

          return (
            <span
              key={s}
              className={`${sizeClasses} rounded font-medium transition-colors ${
                isCurrent
                  ? 'bg-blue-600 text-white'
                  : isCompleted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              }`}
              title={s.replace(/_/g, ' ')}
            >
              {getShortLabel(s)}
            </span>
          )
        })}
      </div>

      {/* Navigation buttons */}
      {showNav && onStageChange && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (prevStage) onStageChange(prevStage as JourneyStage)
            }}
            disabled={!prevStage}
            className={`${navButtonClasses} rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
            title={prevStage ? `Back to ${getShortLabel(prevStage)}` : 'At first stage'}
          >
            <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (nextStage) onStageChange(nextStage as JourneyStage)
            }}
            disabled={!nextStage}
            className={`${navButtonClasses} rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
            title={nextStage ? `Advance to ${getShortLabel(nextStage)}` : 'At final stage'}
          >
            <svg className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
