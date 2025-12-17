import { useState } from 'react'
import type { Journey, JourneyStage } from '../../types'
import { TypeBadge } from './TypeBadge'
import { StageRow } from './StageRow'
import { Button } from '../common/Button'

interface GroupOption {
  id: string
  name: string
}

interface JourneyCardProps {
  journey: Journey
  parentJourneyName?: string  // Name of parent journey if this is a child
  availableGroups?: GroupOption[]  // Groups this journey can be moved to
  onUpdateStage: (stage: JourneyStage) => void
  onStart: () => void
  onDelete: () => void
  onClick?: () => void
  onOpenInVSCode?: () => void
  onOpenParent?: () => void  // Click handler to open parent journey
  onAssignToGroup?: (groupId: string | null) => void  // null = remove from group
}

export function JourneyCard({
  journey,
  parentJourneyName,
  availableGroups = [],
  onUpdateStage,
  onStart,
  onDelete,
  onClick,
  onOpenInVSCode,
  onOpenParent,
  onAssignToGroup,
}: JourneyCardProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const isStarted = journey.branch_name !== null
  const isChildJourney = !!journey.parent_journey_id

  // Filter out current parent from available groups
  const groupsToShow = availableGroups.filter(g => g.id !== journey.parent_journey_id)

  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-gray-600 transition-colors shadow-sm ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Parent journey indicator */}
      {isChildJourney && (
        <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 mb-2 -mt-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          {parentJourneyName ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenParent?.()
              }}
              className="hover:underline"
            >
              Child of: {parentJourneyName}
            </button>
          ) : (
            <span>Child journey</span>
          )}
        </div>
      )}

      {/* Header: Name, type badge, actions */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {journey.name}
            </h3>
            <TypeBadge type={journey.type} size="sm" />
          </div>

          {/* Description */}
          {journey.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {journey.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {/* Start button for intake/reported stages */}
          {(journey.stage === 'intake' || journey.stage === 'reported') && !isStarted && (
            <Button size="sm" onClick={onStart}>
              Start
            </Button>
          )}

          {/* VS Code button */}
          {onOpenInVSCode && (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onOpenInVSCode()
              }}
              title={isStarted ? "Open worktree in VS Code with Claude" : "Open project in VS Code with Claude"}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.583 2.167L11.5 8.25l-3.583-3.5L.833 9.333v5.334l7.084 4.583 3.583-3.5 6.083 6.083 6.584-4.25V6.417l-6.584-4.25zm-.916 14.5l-4.584-4.584 4.584-4.583v9.167z"/>
              </svg>
            </Button>
          )}

          {/* More menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMoreMenu(!showMoreMenu)
              }}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
              title="More actions"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20 py-1">
                  {/* Move to group submenu */}
                  {onAssignToGroup && groupsToShow.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Move to group
                      </div>
                      {groupsToShow.map(group => (
                        <button
                          key={group.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            onAssignToGroup(group.id)
                            setShowMoreMenu(false)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                          </svg>
                          {group.name}
                        </button>
                      ))}
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    </>
                  )}

                  {/* Remove from group option */}
                  {onAssignToGroup && isChildJourney && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onAssignToGroup(null)
                          setShowMoreMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        Remove from group
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    </>
                  )}

                  {/* Delete option */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                      setShowMoreMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Branch info */}
      {isStarted && journey.branch_name && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
          </svg>
          <span className="font-mono truncate" title={journey.branch_name}>
            {journey.branch_name}
          </span>
        </div>
      )}

      {/* Tags */}
      {journey.tags && journey.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
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

      {/* Stage row */}
      <div onClick={e => e.stopPropagation()}>
        <StageRow
          type={journey.type}
          stage={journey.stage}
          onStageChange={onUpdateStage}
          size="sm"
        />
      </div>
    </div>
  )
}
