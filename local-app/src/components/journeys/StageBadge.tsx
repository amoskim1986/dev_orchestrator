import type { JourneyStage, JourneyType } from '../../types'
import {
  FEATURE_PLANNING_STAGES,
  FEATURE_STAGES,
  INVESTIGATION_STAGES,
  BUG_STAGES,
} from '@dev-orchestrator/shared'

interface StageBadgeProps {
  stage: JourneyStage
  type: JourneyType
  size?: 'sm' | 'md'
  showProgress?: boolean
}

// Stage display configuration
const stageDisplay: Record<string, { label: string; color: string }> = {
  // Feature Planning stages
  intake: { label: 'Intake', color: 'gray' },
  speccing: { label: 'Speccing', color: 'purple' },
  ui_planning: { label: 'UI Planning', color: 'pink' },
  planning: { label: 'Planning', color: 'blue' },
  review: { label: 'Review', color: 'yellow' },
  approved: { label: 'Approved', color: 'green' },

  // Feature stages
  review_and_edit_plan: { label: 'Review Plan', color: 'purple' },
  implementing: { label: 'Implementing', color: 'yellow' },
  testing: { label: 'Testing', color: 'orange' },
  pre_prod_review: { label: 'Pre-Prod', color: 'cyan' },
  merge_approved: { label: 'Merge OK', color: 'teal' },
  staging_qa: { label: 'Staging QA', color: 'indigo' },
  deployed: { label: 'Deployed', color: 'green' },

  // Investigation stages
  in_progress: { label: 'In Progress', color: 'yellow' },
  complete: { label: 'Complete', color: 'green' },

  // Bug stages
  reported: { label: 'Reported', color: 'red' },
  investigating: { label: 'Investigating', color: 'orange' },
  fixing: { label: 'Fixing', color: 'yellow' },
}

const colorClasses: Record<string, string> = {
  gray: 'bg-gray-600/20 text-gray-300 border-gray-500/30',
  purple: 'bg-purple-600/20 text-purple-300 border-purple-500/30',
  pink: 'bg-pink-600/20 text-pink-300 border-pink-500/30',
  blue: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
  yellow: 'bg-yellow-600/20 text-yellow-300 border-yellow-500/30',
  green: 'bg-green-600/20 text-green-300 border-green-500/30',
  orange: 'bg-orange-600/20 text-orange-300 border-orange-500/30',
  cyan: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/30',
  teal: 'bg-teal-600/20 text-teal-300 border-teal-500/30',
  indigo: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30',
  red: 'bg-red-600/20 text-red-300 border-red-500/30',
}

function getStagesForType(type: JourneyType): JourneyStage[] {
  switch (type) {
    case 'feature_planning': return FEATURE_PLANNING_STAGES as JourneyStage[]
    case 'feature': return FEATURE_STAGES as JourneyStage[]
    case 'investigation': return INVESTIGATION_STAGES as JourneyStage[]
    case 'bug': return BUG_STAGES as JourneyStage[]
  }
}

export function StageBadge({ stage, type, size = 'md', showProgress = false }: StageBadgeProps) {
  const display = stageDisplay[stage] || { label: stage, color: 'gray' }
  const colorClass = colorClasses[display.color] || colorClasses.gray
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'

  // Calculate progress
  const stages = getStagesForType(type)
  const currentIndex = stages.indexOf(stage)
  const progress = currentIndex >= 0 ? Math.round(((currentIndex + 1) / stages.length) * 100) : 0

  return (
    <span className={`${colorClass} ${sizeClass} rounded border font-medium inline-flex items-center gap-1`}>
      {display.label}
      {showProgress && (
        <span className="text-[10px] opacity-70">({progress}%)</span>
      )}
    </span>
  )
}

// Progress bar component for showing stage progress
export function StageProgress({ stage, type }: { stage: JourneyStage; type: JourneyType }) {
  const stages = getStagesForType(type)
  const currentIndex = stages.indexOf(stage)
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0

  return (
    <div className="w-full">
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] text-gray-500">
        <span>{currentIndex + 1}/{stages.length}</span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
  )
}
