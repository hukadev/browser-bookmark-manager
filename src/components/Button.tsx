type Variant = 'primary' | 'error' | 'success' | 'ghost' | 'outline'
type Size = 'md' | 'sm' | 'xs'

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-primary-content hover:opacity-90',
  error: 'bg-error text-white hover:opacity-90',
  success: 'bg-success text-white hover:opacity-90',
  ghost: 'hover:bg-base-200',
  outline: 'border border-base-300 hover:bg-base-200',
}

const sizeClass: Record<Size, string> = {
  md: 'px-3 py-1.5 text-sm',
  sm: 'px-2.5 py-1 text-xs',
  xs: 'px-2 py-0.5 text-xs',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  square?: boolean
  active?: boolean
}

export function Button({ variant = 'ghost', size = 'md', square, active, className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1 rounded-md font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${sizeClass[size]} ${square ? 'aspect-square p-0' : ''} ${active ? 'bg-base-200' : ''} ${className}`}
      {...props}
    />
  )
}
