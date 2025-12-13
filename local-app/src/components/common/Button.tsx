import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300',
}

const sizeStyles = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        rounded-md font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
