import { cn } from '../../lib/utils'

function Badge({ className, variant = 'default', ...props }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        {
          'bg-primary/10 text-primary': variant === 'default',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
          'bg-destructive/10 text-destructive': variant === 'destructive',
          'bg-green-500/10 text-green-600': variant === 'success',
          'bg-yellow-500/10 text-yellow-600': variant === 'warning',
          'bg-blue-500/10 text-blue-600': variant === 'info',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
