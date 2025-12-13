import { useJourneyPlan } from '@dev-orchestrator/shared'
import type { Journey } from '../../../types'
import { Button } from '../../common/Button'

interface PlanTabProps {
  journey: Journey
}

interface PlanStep {
  order: number
  title: string
  description?: string
  filesToCreate?: string[]
  filesToModify?: string[]
}

interface PlanContent {
  featureName?: string
  estimatedComplexity?: string
  steps?: PlanStep[]
  risks?: string[]
  dependencies?: string[]
}

export function PlanTab({ journey }: PlanTabProps) {
  const { plan, loading, error } = useJourneyPlan(journey.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 dark:text-gray-400">
        Loading plan...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400 p-4">
        Error loading plan: {error.message}
      </div>
    )
  }

  const planContent = plan?.content as PlanContent | null

  if (!plan || !planContent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
        <p className="text-sm mb-2">No implementation plan yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Create a spec first, then generate a plan</p>
        <Button
          variant="secondary"
          disabled
          title="Coming soon"
        >
          Generate Plan with AI
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{planContent.featureName || 'Implementation Plan'}</h3>
          {planContent.estimatedComplexity && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Complexity: <span className="text-blue-600 dark:text-blue-400">{planContent.estimatedComplexity}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled title="Coming soon">
            Regenerate
          </Button>
        </div>
      </div>

      {/* Steps */}
      {planContent.steps && planContent.steps.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Implementation Steps</h4>
          {planContent.steps.map((step, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                  {step.order || index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 dark:text-white">{step.title}</h5>
                  {step.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{step.description}</p>
                  )}
                  {step.filesToCreate && step.filesToCreate.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-green-600 dark:text-green-400">Create:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {step.filesToCreate.map((file, i) => (
                          <code key={i} className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-green-700 dark:text-green-300">
                            {file}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                  {step.filesToModify && step.filesToModify.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">Modify:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {step.filesToModify.map((file, i) => (
                          <code key={i} className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-yellow-700 dark:text-yellow-300">
                            {file}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Risks */}
      {planContent.risks && planContent.risks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Risks</h4>
          <ul className="space-y-1">
            {planContent.risks.map((risk, index) => (
              <li key={index} className="text-sm text-orange-600 dark:text-orange-400 flex items-start gap-2">
                <span className="text-orange-500">⚠</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dependencies */}
      {planContent.dependencies && planContent.dependencies.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-300">Dependencies</h4>
          <div className="flex flex-wrap gap-2">
            {planContent.dependencies.map((dep, index) => (
              <span key={index} className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 px-2 py-1 rounded">
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
        {plan.ai_generated && <span className="text-green-600 dark:text-green-400 mr-2">AI Generated</span>}
        Last updated: {new Date(plan.updated_at).toLocaleString()}
      </div>
    </div>
  )
}
