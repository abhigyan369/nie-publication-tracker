import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { BookOpen, TrendingUp, Clock, CheckCircle, Users, ArrowUpRight, Loader2 } from 'lucide-react'
import analyticsService from '../../services/analytics.service'
import { useAuth } from '../../context/AuthContext'

function StatCard({ title, value, change, icon: Icon, trend }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
            {change && (
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500 font-medium">{change}%</span>
                <span className="text-sm text-muted-foreground">from last month</span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await analyticsService.getDashboardStats()
        setStats(response.data.data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.firstName}!
        </h2>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your publications.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Publications"
          value={stats?.overview?.totalPublications || 0}
          change={12}
          icon={BookOpen}
        />
        <StatCard
          title="Published"
          value={stats?.overview?.publishedCount || 0}
          change={8}
          icon={CheckCircle}
        />
        <StatCard
          title="Under Review"
          value={stats?.overview?.pendingCount || 0}
          icon={Clock}
        />
        <StatCard
          title="Total Citations"
          value={stats?.overview?.totalCitations || 0}
          change={24}
          icon={TrendingUp}
        />
      </div>

      {/* Recent Publications & Top Authors */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Publications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recent Publications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentPublications?.length > 0 ? (
                stats.recentPublications.map((pub) => (
                  <div
                    key={pub.id}
                    className="flex items-start justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground line-clamp-1">{pub.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {pub.author?.firstName} {pub.author?.lastName}
                      </p>
                    </div>
                    <Badge variant={pub.status === 'PUBLISHED' ? 'success' : 'warning'}>
                      {pub.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No publications yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Authors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Authors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topAuthors?.length > 0 ? (
                stats.topAuthors.map((author, index) => (
                  <div
                    key={author.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {author.firstName} {author.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{author.department}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{author.publicationCount}</p>
                      <p className="text-sm text-muted-foreground">publications</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DashboardPage
