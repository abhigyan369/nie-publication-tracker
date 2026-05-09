import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  Loader2,
  FileText,
  User,
  Activity,
  Filter,
  RefreshCw,
} from 'lucide-react'
import workflowService from '../../services/workflow.service'
import { formatDate } from '../../lib/utils'

const actionColors = {
  CREATE: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Created' },
  UPDATE: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Updated' },
  DELETE: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Deleted' },
  SOFT_DELETE: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Deleted' },
  STATUS_CHANGE: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Status Changed' },
  SUBMIT_FOR_REVIEW: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Submitted' },
  APPROVE: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Approved' },
  REJECT: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Rejected' },
  REVISION_REQUESTED: { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Revision Requested' },
  UPLOAD_FILE: { bg: 'bg-gray-500/10', text: 'text-gray-600', label: 'File Uploaded' },
  LOGIN: { bg: 'bg-gray-500/10', text: 'text-gray-600', label: 'Login' },
  LOGOUT: { bg: 'bg-gray-500/10', text: 'text-gray-600', label: 'Logout' },
  PASSWORD_CHANGE: { bg: 'bg-gray-500/10', text: 'text-gray-600', label: 'Password Changed' },
}

function AuditLogsPage() {
  const { showToast } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ action: '', entityType: '' })

  useEffect(() => {
    fetchLogs()
  }, [filter])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await workflowService.getActivityLogs({
        action: filter.action || undefined,
        entityType: filter.entityType || undefined,
      })
      setLogs(res.data.data.logs)
    } catch (error) {
      showToast('Failed to load activity logs', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Activity Logs</h2>
          <p className="text-muted-foreground">Track all system activities and changes</p>
        </div>
        <Button variant="outline" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Action</label>
              <select
                value={filter.action}
                onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-4 py-2 text-sm"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="STATUS_CHANGE">Status Change</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Entity Type</label>
              <select
                value={filter.entityType}
                onChange={(e) => setFilter({ ...filter, entityType: e.target.value })}
                className="h-10 rounded-lg border border-input bg-background px-4 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="Publication">Publications</option>
                <option value="User">Users</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => {
                const config = actionColors[log.action] || { bg: 'bg-gray-500/10', text: 'text-gray-600', label: log.action }
                return (
                  <div key={log.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                      <Activity className={`h-5 w-5 ${config.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge className={`${config.bg} ${config.text} border-0`}>
                          {config.label}
                        </Badge>
                        {log.entityType && (
                          <Badge variant="secondary">{log.entityType}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {log.details?.title ? `"${log.details.title}" - ` : ''}
                        {log.details?.fromStatus && `${log.details.fromStatus.replace(/_/g, ' ')} → `}
                        {log.details?.toStatus && log.details.toStatus.replace(/_/g, ' ')}
                        {log.details?.comment && <span className="text-muted-foreground"> - "{log.details.comment}"</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.user.firstName} {log.user.lastName}
                        </span>
                        <span>{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4" />
              <p>No activity logs found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditLogsPage
