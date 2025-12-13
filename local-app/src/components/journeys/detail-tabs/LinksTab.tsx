import { useJourneyLinks } from '@dev-orchestrator/shared'
import type { Journey } from '../../../types'
import { Button } from '../../common/Button'

interface LinksTabProps {
  journey: Journey
}

export function LinksTab({ journey }: LinksTabProps) {
  const {
    outgoingLinks,
    incomingLinks,
    loading,
    error,
    getLinksByRelationship,
  } = useJourneyLinks(journey.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Loading links...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-400 p-4">
        Error loading links: {error.message}
      </div>
    )
  }

  const hasLinks = outgoingLinks.length > 0 || incomingLinks.length > 0

  return (
    <div className="space-y-6">
      {/* Parent Journey (spawned_from incoming) */}
      {(() => {
        const { incoming } = getLinksByRelationship('spawned_from')
        if (incoming.length === 0) return null
        return (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <span>🌱</span> Parent Journey
            </h4>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              {incoming.map((link) => (
                <div key={link.from_journey_id} className="flex items-center justify-between">
                  <span className="text-sm text-blue-400">
                    Journey ID: {link.from_journey_id.slice(0, 8)}...
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(link.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Spawned Journeys (spawned_from outgoing) */}
      {(() => {
        const { outgoing } = getLinksByRelationship('spawned_from')
        if (outgoing.length === 0) return null
        return (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <span>✨</span> Spawned From This
            </h4>
            <div className="space-y-2">
              {outgoing.map((link) => (
                <div key={link.to_journey_id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex items-center justify-between">
                  <span className="text-sm text-green-400">
                    Journey ID: {link.to_journey_id.slice(0, 8)}...
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(link.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Dependencies */}
      {(() => {
        const { outgoing, incoming } = getLinksByRelationship('depends_on')
        if (outgoing.length === 0 && incoming.length === 0) return null
        return (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <span>⏳</span> Dependencies
            </h4>
            {outgoing.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">This journey depends on:</p>
                {outgoing.map((link) => (
                  <div key={link.to_journey_id} className="bg-gray-800 rounded-lg p-2 border border-gray-700 text-sm text-yellow-400">
                    Journey ID: {link.to_journey_id.slice(0, 8)}...
                  </div>
                ))}
              </div>
            )}
            {incoming.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-xs text-gray-500">Depends on this journey:</p>
                {incoming.map((link) => (
                  <div key={link.from_journey_id} className="bg-gray-800 rounded-lg p-2 border border-gray-700 text-sm text-yellow-400">
                    Journey ID: {link.from_journey_id.slice(0, 8)}...
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Blockers */}
      {(() => {
        const { outgoing, incoming } = getLinksByRelationship('blocks')
        if (outgoing.length === 0 && incoming.length === 0) return null
        return (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <span>🚫</span> Blockers
            </h4>
            {outgoing.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">This journey blocks:</p>
                {outgoing.map((link) => (
                  <div key={link.to_journey_id} className="bg-gray-800 rounded-lg p-2 border border-red-900/50 text-sm text-red-400">
                    Journey ID: {link.to_journey_id.slice(0, 8)}...
                  </div>
                ))}
              </div>
            )}
            {incoming.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-xs text-gray-500">Blocked by:</p>
                {incoming.map((link) => (
                  <div key={link.from_journey_id} className="bg-gray-800 rounded-lg p-2 border border-red-900/50 text-sm text-red-400">
                    Journey ID: {link.from_journey_id.slice(0, 8)}...
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Related */}
      {(() => {
        const { outgoing, incoming } = getLinksByRelationship('related_to')
        const allRelated = [...outgoing, ...incoming]
        if (allRelated.length === 0) return null
        return (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <span>🔗</span> Related Journeys
            </h4>
            <div className="space-y-1">
              {outgoing.map((link) => (
                <div key={link.to_journey_id} className="bg-gray-800 rounded-lg p-2 border border-gray-700 text-sm text-blue-400">
                  Journey ID: {link.to_journey_id.slice(0, 8)}...
                </div>
              ))}
              {incoming.map((link) => (
                <div key={link.from_journey_id} className="bg-gray-800 rounded-lg p-2 border border-gray-700 text-sm text-blue-400">
                  Journey ID: {link.from_journey_id.slice(0, 8)}...
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Empty State */}
      {!hasLinks && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-sm">No linked journeys</p>
          <p className="text-xs text-gray-500 mt-1">Link related journeys to track dependencies</p>
        </div>
      )}

      {/* Add Link Button */}
      <div className="pt-4 border-t border-gray-700">
        <Button variant="secondary" disabled title="Coming soon">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Link Journey
        </Button>
      </div>
    </div>
  )
}
