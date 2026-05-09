import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  BookOpen,
  ChevronRight,
  Send,
} from 'lucide-react'
import workflowService from '../../services/workflow.service'
import { formatDate, getInitials } from '../../lib/utils'
import publicationService from '../../services/publication.service'

const statusFlow = [
  { status: 'DRAFT', label: 'Draft', icon: null },
  { status: 'SUBMITTED', label: 'Submitted', icon: Send },
  { status: 'UNDER_REVIEW', label: 'Under Review', icon: Clock },
  { status: 'REVISION_REQUESTED', label: 'Revisions', icon: AlertCircle },
  { status: 'ACCEPTED', label: 'Accepted', icon: CheckCircle },
  { status: 'PUBLISHED', label: 'Published', icon: BookOpen },
]

function StatusTimeline({ publicationId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [publicationId])

  const fetchHistory = async () => {
    try {
      const res = await workflowService.getStatusHistory(publicationId)
      setHistory(res.data.data)
    } catch (error) {
      console.error('Failed to fetch history')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Loader2 className="h-6 w-6 animate-spin" />
  }

  return (
    <div className="space-y-4">
      {/* Visual Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-6 relative">
          {statusFlow.map((step, index) => {
            const transition = history.find(h => h.toStatus === step.status)
            const isCompleted = !!transition
            const isCurrent = index === statusFlow.findIndex(s => s.status === history[0]?.toStatus)

            return (
              <div key={step.status} className="flex items-center gap-4 relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                    isCompleted
                      ? 'bg-green-500/10 border-2 border-green-500'
                      : 'bg-muted border-2 border-border'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                >
                  {step.icon ? (
                    <step.icon className={`h-5 w-5 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`} />
                  ) : (
                    <span className={`text-sm font-medium ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.label}
                  </p>
                  {transition && (
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>{formatDate(transition.createdAt)}</p>
                      {transition.reviewedBy && (
                        <p className="flex items-center gap-1 mt-1">
                          <User className="h-3 w-3" />
                          {transition.reviewedBy.firstName} {transition.reviewedBy.lastName}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed History */}
      <div className="border-t border-border pt-4">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Activity Log</h4>
        <div className="space-y-3">
          {history.map((entry) => (
            <div key={entry.id} className="flex gap-3 text-sm">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
              <div className="flex-1">
                <p className="text-foreground">
                  {entry.fromStatus && <span>{entry.fromStatus.replace(/_/g, ' ')} → </span>}
                  <span className="font-medium">{entry.toStatus.replace(/_/g, ' ')}</span>
                </p>
                {entry.comment && (
                  <p className="text-muted-foreground mt-1 p-2 bg-muted/50 rounded text-xs">
                    "{entry.comment}"
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatDate(entry.createdAt)}</span>
                  {entry.reviewedBy && (
                    <>
                      <span>•</span>
                      <span>{entry.reviewedBy.firstName} {entry.reviewedBy.lastName}</span>
                      <Badge variant="secondary" className="text-xs">{entry.reviewedBy.role}</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StatusTimeline
