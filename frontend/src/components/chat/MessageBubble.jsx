import { Bot, User } from 'lucide-react'
import { cn } from '../../lib/utils'

function formatTime(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function MessageBubble({ message }) {
  const isUser = message.role === 'USER' || message.role === 'user'
  const Icon = isUser ? User : Bot

  return (
    <div className={cn('flex gap-3', isUser && 'justify-end')}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-card-foreground'
        )}
      >
        <p className="whitespace-pre-wrap leading-6">{message.content}</p>
        {message.createdAt && (
          <p
            className={cn(
              'mt-2 text-[11px]',
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>

      {isUser && (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

export default MessageBubble
