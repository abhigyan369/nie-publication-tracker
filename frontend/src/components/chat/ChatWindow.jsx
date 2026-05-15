import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, Loader2, MessageSquarePlus, Search, Sparkles } from 'lucide-react'
import chatService from '../../services/chat.service'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import ChatInput from './ChatInput'
import MessageBubble from './MessageBubble'

const suggestedQuestions = [
  'Show most cited publications',
  'Which faculty has maximum publications?',
  'Research trends in AI',
  'Show publication statistics',
]

function normalizeMessages(messages = []) {
  return messages.map((message) => ({
    ...message,
    role: message.role ?? 'ASSISTANT',
    createdAt: message.createdAt ?? new Date().toISOString(),
  }))
}

function ChatWindow() {
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions]
  )

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true)
        const history = await chatService.getHistory()
        setSessions(history)

        if (history.length > 0) {
          setActiveSessionId(history[0].id)
          setMessages(normalizeMessages(history[0].messages))
        }
      } catch (historyError) {
        console.error('Failed to load chat history:', historyError)
        setError('Chat history could not be loaded.')
      } finally {
        setLoadingHistory(false)
      }
    }

    loadHistory()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const refreshHistory = async (nextSessionId) => {
    const history = await chatService.getHistory()
    setSessions(history)

    const session = history.find((item) => item.id === nextSessionId)
    if (session) {
      setMessages(normalizeMessages(session.messages))
    }
  }

  const selectSession = (session) => {
    setActiveSessionId(session.id)
    setMessages(normalizeMessages(session.messages))
    setError('')
  }

  const startNewChat = () => {
    setActiveSessionId(null)
    setMessages([])
    setInput('')
    setError('')
  }

  const sendMessage = async (presetQuestion) => {
    const text = (presetQuestion ?? input).trim()
    if (!text || sending) return

    const now = new Date().toISOString()
    const userMessage = {
      id: `user-${now}`,
      role: 'USER',
      content: text,
      createdAt: now,
    }

    setMessages((current) => [...current, userMessage])
    setInput('')
    setSending(true)
    setError('')

    try {
      const response = await chatService.sendMessage({
        message: text,
        sessionId: activeSessionId,
      })

      const nextSessionId = response?.sessionId ?? activeSessionId
      setActiveSessionId(nextSessionId)
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'ASSISTANT',
          content:
            response?.answer ??
            'I could not find relevant information in the NIE Publication Tracker database.',
          createdAt: new Date().toISOString(),
          metadata: { retrievedContexts: response?.retrievedContexts ?? [] },
        },
      ])

      if (nextSessionId) {
        await refreshHistory(nextSessionId)
      }
    } catch (sendError) {
      console.error('Failed to send chat message:', sendError)
      setError('The assistant could not answer right now. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex min-h-[220px] flex-col rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Chat History</h2>
            <p className="text-xs text-muted-foreground">{sessions.length} sessions</p>
          </div>
          <Button variant="outline" size="icon" onClick={startNewChat} aria-label="New chat">
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingHistory ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : sessions.length > 0 ? (
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => selectSession(session)}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    activeSessionId === session.id && 'bg-primary/10 text-primary'
                  )}
                >
                  <span className="block truncate font-medium">
                    {session.title || 'Untitled chat'}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {session.messages?.length ?? 0} messages
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-muted-foreground">
              <Search className="h-5 w-5" />
              <p>No chat history yet.</p>
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-lg border border-border bg-background">
        <div className="border-b border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                {activeSession?.title || 'NIE Research Assistant'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Answers are restricted to publication tracker data.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Ask a research question</h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Use the assistant to query publications, faculty, citation counts, departments,
                research areas, and analytics from the tracker database.
              </p>
              <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    disabled={sending}
                    className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg border border-border bg-card px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Searching tracker data...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="border-t border-border bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage()}
          disabled={sending}
        />
      </section>
    </div>
  )
}

export default ChatWindow
