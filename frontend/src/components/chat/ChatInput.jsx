import { Send } from 'lucide-react'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'

function ChatInput({ value, onChange, onSubmit, disabled }) {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="flex items-end gap-3 border-t border-border bg-card p-4">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about publications, faculty, citations, departments, or research trends..."
        disabled={disabled}
        rows={2}
        className="max-h-32 min-h-[52px] resize-none"
      />
      <Button
        type="button"
        size="icon"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="h-[52px] w-[52px] shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default ChatInput
