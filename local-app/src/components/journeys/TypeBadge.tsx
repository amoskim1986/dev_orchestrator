import type { JourneyType } from '../../types'

interface TypeBadgeProps {
  type: JourneyType
  size?: 'sm' | 'md'
}

const typeConfig: Record<JourneyType, { label: string; className: string; icon: string }> = {
  feature_planning: {
    label: 'Planning',
    className: 'bg-purple-100 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30',
    icon: '📋',
  },
  feature: {
    label: 'Feature',
    className: 'bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30',
    icon: '✨',
  },
  bug: {
    label: 'Bug',
    className: 'bg-red-100 dark:bg-red-600/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/30',
    icon: '🐛',
  },
  investigation: {
    label: 'Investigation',
    className: 'bg-amber-100 dark:bg-amber-600/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30',
    icon: '🔍',
  },
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const config = typeConfig[type]
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'

  return (
    <span className={`${config.className} ${sizeClass} rounded font-medium inline-flex items-center gap-1`}>
      <span className="text-[10px]">{config.icon}</span>
      {config.label}
    </span>
  )
}
