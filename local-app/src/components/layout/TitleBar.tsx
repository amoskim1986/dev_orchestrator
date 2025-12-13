interface TitleBarProps {
  title?: string
}

export function TitleBar({ title = 'Dev Orchestrator' }: TitleBarProps) {
  return (
    <div className="titlebar h-10 bg-white dark:bg-gray-800 flex items-center justify-center shrink-0 border-b border-gray-200 dark:border-gray-700">
      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{title}</span>
    </div>
  )
}
