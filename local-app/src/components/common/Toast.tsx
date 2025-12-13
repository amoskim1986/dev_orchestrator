import { useEffect, useState } from 'react'

export interface ToastData {
  id: string
  message: string
  type: 'error' | 'success' | 'info'
  duration?: number
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    const duration = toast.duration ?? 4000
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300) // Start exit animation 300ms before removal

    const removeTimer = setTimeout(() => {
      onDismiss(toast.id)
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
    }
  }, [toast.id, toast.duration, onDismiss])

  const bgColor = {
    error: 'bg-red-100 dark:bg-red-900/90 border-red-300 dark:border-red-700',
    success: 'bg-green-100 dark:bg-green-900/90 border-green-300 dark:border-green-700',
    info: 'bg-blue-100 dark:bg-blue-900/90 border-blue-300 dark:border-blue-700',
  }[toast.type]

  const icon = {
    error: (
      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }[toast.type]

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ${bgColor} ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      {icon}
      <p className="text-sm text-gray-800 dark:text-white flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
