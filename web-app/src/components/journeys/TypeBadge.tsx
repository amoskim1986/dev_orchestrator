import type { JourneyType } from '@dev-orchestrator/shared'

interface TypeBadgeProps {
  type: JourneyType
  size?: 'sm' | 'md'
}

const typeConfig: Record<JourneyType, { label: string; className: string; icon: string }> = {
  feature_planning: {
    label: 'Planning',
    className: 'bg-purple-600/20 text-purple-300 border border-purple-500/30',
    icon: '📋',
  },
  feature: {
    label: 'Feature',
    className: 'bg-blue-600/20 text-blue-300 border border-blue-500/30',
    icon: '✨',
  },
  bug: {
    label: 'Bug',
    className: 'bg-red-600/20 text-red-300 border border-red-500/30',
    icon: '🐛',
  },
  investigation: {
    label: 'Investigation',
    className: 'bg-yellow-600/20 text-yellow-300 border border-yellow-500/30',
    icon: '🔍',
  },
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const config = typeConfig[type]
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'

  return (
    <span className={`${config.className} ${sizeClass} rounded font-medium inline-flex items-center gap-1`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}
