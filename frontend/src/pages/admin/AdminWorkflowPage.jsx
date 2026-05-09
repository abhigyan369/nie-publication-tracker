import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  BookOpen,
  FileText,
  TrendingUp,
  Users,
  Eye,
  Check,
  X,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import workflowService from '../../services/workflow.service'
import { formatDate } from '../../lib/utils'

const statusConfig = {
  SUBMITTED: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock, label: 'Submitted' },
  UNDER_REVIEW: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Eye, label: 'Under Review' },
  REVISION_REQUESTED: { color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', icon: AlertCircle, label: 'Revision Requested' },
  ACCEPTED: { color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle, label: 'Accepted' },
  PUBLISHED: { color: 'bg-primary/10 text-primary border-primary/20', icon: BookOpen, label: 'Published' },
  REJECTED: { color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle, label: 'Rejected' },
}

function AdminWorkflowPage() {
  const { user, showToast } = useAuth()
  const navigate = useNavigate()
  const [publications, setPublications] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')

  // Check if user is admin/hod
  const isAdmin = ['ADMIN', 'HOD', 'REVIEWER'].includes(user?.role)

  useEffect(() => {
    if (!isAdmin) {
      showToast('You do not have permission to access this page', 'error')
      navigate('/dashboard')
      return
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pendingRes, statsRes] = await Promise.all([
        workflowService.getPending({ status: activeTab }),
        workflowService.getStats(),
      ])
      setPublications(pendingRes.data.data.publications)
      setStats(statsRes.data.data)
    } catch (error) {
      showToast('Failed to load workflow data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action, publicationId, comment = null) => {
    try {
      await action(publicationId, comment)
      showToast('Action completed successfully', 'success')
      fetchData()
    } catch (error) {
      showToast(error.response?.data?.message || 'Action failed', 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Admin Workflow</h2>
        <p className="text-muted-foreground">Review and manage publication submissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Pending Review"
          value={stats?.pendingReview || 0}
          icon={Clock}
          color="text-yellow-600"
        />
        <StatCard
          title="Under Review"
          value={stats?.underReview || 0}
          icon={Eye}
          color="text-blue-600"
        />
        <StatCard
          title="Approved This Month"
          value={stats?.approvedThisMonth || 0}
          icon={CheckCircle}
          color="text-green-600"
        />
        <StatCard
          title="Avg. Review Time"
          value={`${stats?.avgReviewTime || 0} days`}
          icon={TrendingUp}
          color="text-purple-600"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        <button
          onClick={() => { setActiveTab('pending'); fetchData() }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'pending' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => { setActiveTab('review'); fetchData() }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'review' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Under Review
        </button>
        <button
          onClick={() => { setActiveTab('revision'); fetchData() }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'revision' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Revision Requested
        </button>
      </div>

      {/* Publications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Publications ({publications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : publications.length > 0 ? (
            <div className="space-y-4">
              {publications.map((pub) => (
                <PublicationCard
                  key={pub.id}
                  publication={pub}
                  onApprove={() => handleAction(workflowService.approve, pub.id)}
                  onReject={() => handleAction(workflowService.reject, pub.id)}
                  onRevision={() => handleAction(workflowService.requestRevision, pub.id)}
                  onUnderReview={() => handleAction(workflowService.markUnderReview, pub.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No publications in this category
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          </div>
          <div className={`h-12 w-12 rounded-lg bg-muted flex items-center justify-center`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PublicationCard({ publication, onApprove, onReject, onRevision, onUnderReview }) {
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [comment, setComment] = useState('')
  const [actionType, setActionType] = useState(null)

  const handleActionClick = (type) => {
    setActionType(type)
    setShowCommentModal(true)
  }

  const handleSubmit = async () => {
    if (actionType === 'approve') {
      await workflowService.approve(publication.id, comment)
    } else if (actionType === 'reject') {
      await workflowService.reject(publication.id, comment)
    } else if (actionType === 'revision') {
      await workflowService.requestRevision(publication.id, comment)
    }
    setShowCommentModal(false)
    setComment('')
  }

  return (
    <div className="p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{publication.publicationType?.replace(/_/g, ' ')}</Badge>
            <Badge className={statusConfig[publication.status]?.color}>
              {statusConfig[publication.status]?.label || publication.status}
            </Badge>
          </div>
          <Link
            to={`/publications/${publication.id}`}
            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
          >
            {publication.title}
          </Link>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {publication.author?.firstName} {publication.author?.lastName}
            </span>
            <span>{publication.department || 'N/A'}</span>
            <span>Submitted {formatDate(publication.createdAt)}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onUnderReview} title="Mark Under Review">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleActionClick('approve')} title="Approve">
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-orange-600 hover:text-orange-700" onClick={() => handleActionClick('revision')} title="Request Revision">
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleActionClick('reject')} title="Reject">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {actionType === 'approve' ? 'Approve Publication' : actionType === 'reject' ? 'Reject Publication' : 'Request Revision'}
              </h3>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={actionType === 'approve' ? 'Add approval comments (optional)...' : actionType === 'reject' ? 'Rejection reason is required...' : 'Specify revisions needed...'}
                rows={4}
                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-3 p-6 pt-0 justify-end">
              <Button variant="outline" onClick={() => setShowCommentModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={actionType !== 'approve' && !comment.trim()}
              >
                {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Request Revisions'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminWorkflowPage
