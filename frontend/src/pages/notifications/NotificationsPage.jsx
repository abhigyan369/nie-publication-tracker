import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  Loader2,
  Bell,
  Check,
  CheckCheck,
  FileText,
  MessageSquare,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react'
import workflowService from '../../services/workflow.service'
import { formatDate } from '../../lib/utils'

const typeIcons = {
  PUBLICATION_SUBMITTED: FileText,
  PUBLICATION_APPROVED: Check,
  PUBLICATION_REJECTED: AlertCircle,
  REVISION_REQUESTED: MessageSquare,
  PUBLICATION_PUBLISHED: Bell,
  COMMENT_ADDED: MessageSquare,
  SYSTEM_ANNOUNCEMENT: Bell,
  DEADLINE_REMINDER: Clock,
}

const typeColors = {
  PUBLICATION_SUBMITTED: 'bg-blue-500/10 text-blue-600',
  PUBLICATION_APPROVED: 'bg-green-500/10 text-green-600',
  PUBLICATION_REJECTED: 'bg-red-500/10 text-red-600',
  REVISION_REQUESTED: 'bg-orange-500/10 text-orange-600',
  PUBLICATION_PUBLISHED: 'bg-purple-500/10 text-purple-600',
  COMMENT_ADDED: 'bg-blue-500/10 text-blue-600',
  SYSTEM_ANNOUNCEMENT: 'bg-gray-500/10 text-gray-600',
  DEADLINE_REMINDER: 'bg-yellow-500/10 text-yellow-600',
}

function NotificationsPage() {
  const { showToast } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const [notifRes, countRes] = await Promise.all([
        workflowService.getNotifications(),
        workflowService.getUnreadCount(),
      ])
      setNotifications(notifRes.data.data)
      setUnreadCount(countRes.data.data.count)
    } catch (error) {
      showToast('Failed to load notifications', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId) => {
    try {
      await workflowService.markAsRead(notificationId)
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ))
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      showToast('Failed to mark as read', 'error')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await workflowService.markAllAsRead()
      setNotifications(notifications.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      showToast('All notifications marked as read', 'success')
    } catch (error) {
      showToast('Failed to mark all as read', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell
                const colorClass = typeColors[notification.type] || 'bg-muted text-muted-foreground'

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-accent/50 ${
                      notification.isRead ? 'bg-background' : 'bg-primary/5 border-primary/20'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-2 hover:bg-accent rounded-lg transition-colors"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationsPage
