import type { JourneyStatus } from '../../types'

interface StatusBadgeProps {
  status: JourneyStatus
  size?: 'sm' | 'md'
}

const statusConfig: Record<JourneyStatus, { label: string; className: string }> = {
  planning: {
    label: 'Planning',
    className: 'bg-gray-600 text-gray-200',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow-600 text-yellow-100',
  },
  ready: {
    label: 'Ready',
    className: 'bg-green-600 text-green-100',
  },
  deployed: {
    label: 'Deployed',
    className: 'bg-blue-600 text-blue-100',
  },
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status]
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'

  return (
    <span className={`${config.className} ${sizeClass} rounded-full font-medium`}>
      {config.label}
    </span>
  )
}
