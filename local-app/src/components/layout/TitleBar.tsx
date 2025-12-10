interface TitleBarProps {
  title?: string
}

export function TitleBar({ title = 'Dev Orchestrator' }: TitleBarProps) {
  return (
    <div className="titlebar h-10 bg-gray-800 flex items-center justify-center shrink-0 border-b border-gray-700">
      <span className="text-sm text-gray-400 font-medium">{title}</span>
    </div>
  )
}
