import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import analyticsService from '../../services/analytics.service'
import { MetricCard, KPICardSkeleton, ChartCard, ChartSkeleton } from '../../components/common/Charts'
import {
  BookOpen,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Award,
} from 'lucide-react'
import {
  AreaChartComponent,
  BarChartComponent,
  PieChartComponent,
  DonutChartComponent,
  ProgressBar,
} from '../../components/charts/Charts'
import { formatDate } from '../../lib/utils'

function AnalyticsPage() {
  const { showToast } = useAuth()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [monthlyTrends, setMonthlyTrends] = useState([])
  const [departmentData, setDepartmentData] = useState([])
  const [statusRatio, setStatusRatio] = useState(null)
  const [citations, setCitations] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [typeDistribution, setTypeDistribution] = useState([])
  const [quartileDistribution, setQuartileDistribution] = useState([])
  const [filters, setFilters] = useState({ startDate: '', endDate: '' })

  useEffect(() => {
    fetchAnalytics()
  }, [filters])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = filters.startDate && filters.endDate ? filters : {}

      const [overviewRes, monthlyRes, deptRes, statusRes, citationsRes, leaderRes] = await Promise.all([
        analyticsService.getOverview(params),
        analyticsService.getMonthly(params),
        analyticsService.getDepartments(params),
        analyticsService.getStatusRatio(params),
        analyticsService.getCitations(params),
        analyticsService.getLeaderboard({ limit: 10 }),
      ])

      setOverview(overviewRes.data.data)
      setMonthlyTrends(monthlyRes.data.data)
      setDepartmentData(deptRes.data.data)
      setStatusRatio(statusRes.data.data)
      setCitations(citationsRes.data.data)
      setLeaderboard(leaderRes.data.data)

      // Format distributions
      if (overviewRes.data.data.typeDistribution) {
        setTypeDistribution(
          overviewRes.data.data.typeDistribution.map((item) => ({
            name: item.type.replace(/_/g, ' '),
            value: item.count,
          }))
        )
      }

      if (overviewRes.data.data.quartileDistribution) {
        setQuartileDistribution(
          overviewRes.data.data.quartileDistribution.map((item) => ({
            name: item.quartile,
            value: item.count,
            color:
              item.quartile === 'Q1'
                ? '#22c55e'
                : item.quartile === 'Q2'
                ? '#3b82f6'
                : item.quartile === 'Q3'
                ? '#f59e0b'
                : '#ef4444',
          }))
        )
      }
    } catch (error) {
      showToast('Failed to load analytics', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton height="350px" />
          <ChartSkeleton height="350px" />
        </div>
      </div>
    )
  }

  const ov = overview?.overview || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-muted-foreground">Publication insights and trends</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Publications"
          value={ov.totalPublications?.toLocaleString() || 0}
          icon={BookOpen}
          trend="up"
          trendValue="12%"
        />
        <MetricCard
          title="Total Citations"
          value={ov.totalCitations?.toLocaleString() || 0}
          icon={TrendingUp}
          trend="up"
          trendValue="8%"
        />
        <MetricCard
          title="Avg Impact Factor"
          value={ov.avgImpactFactor?.toFixed(2) || '0.00'}
          icon={Award}
        />
        <MetricCard
          title="Acceptance Rate"
          value={`${ov.acceptanceRate || 0}%`}
          icon={CheckCircle}
          subtitle="of reviewed"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trends */}
        <ChartCard
          title="Publication Trends"
          subtitle="Last 12 months"
        >
          <AreaChartComponent
            data={monthlyTrends}
            xKey="month"
            areas={[
              { dataKey: 'count', name: 'Publications', color: '#6366f1' },
              { dataKey: 'published', name: 'Published', color: '#22c55e' },
            ]}
            height={280}
          />
        </ChartCard>

        {/* Status Distribution */}
        <ChartCard
          title="Publication Status"
          subtitle="Current distribution"
        >
          {statusRatio && (
            <div className="flex items-center justify-center">
              <DonutChartComponent
                data={statusRatio.data}
                height={280}
                label="Total"
              />
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Publication Types */}
        <ChartCard
          title="By Type"
          subtitle="Publication type distribution"
        >
          <PieChartComponent
            data={typeDistribution}
            height={280}
          />
        </ChartCard>

        {/* Quartile Distribution */}
        <ChartCard
          title="Quartile Distribution"
          subtitle="Impact factor rankings"
        >
          <BarChartComponent
            data={quartileDistribution}
            xKey="name"
            bars={[{ dataKey: 'value', name: 'Publications' }]}
            height={280}
          />
        </ChartCard>

        {/* Department Performance */}
        <ChartCard
          title="Top Departments"
          subtitle="By publication count"
        >
          <div className="space-y-3">
            {departmentData.slice(0, 5).map((dept, index) => (
              <div key={dept.department} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{dept.department}</span>
                  <span className="text-muted-foreground">{dept.totalPublications}</span>
                </div>
                <ProgressBar
                  value={dept.totalPublications}
                  max={departmentData[0]?.totalPublications || 1}
                  color={`hsl(${200 + index * 20}, 70%, 50%)`}
                />
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Citation Analysis */}
        <ChartCard
          title="Citation Analysis"
          subtitle="Top cited publications"
        >
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {citations?.topPublications?.map((pub, index) => (
              <div key={pub.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{pub.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {pub.author?.firstName} {pub.author?.lastName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary">{pub.citationCount}</span>
                  <p className="text-xs text-muted-foreground">citations</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Faculty Leaderboard */}
        <ChartCard
          title="Faculty Leaderboard"
          subtitle="Top performers"
        >
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {leaderboard.map((faculty, index) => (
              <div key={faculty.authorId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs font-medium text-white">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{faculty.name}</p>
                  <p className="text-xs text-muted-foreground">{faculty.department}</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <span className="font-bold">{faculty.published}</span>
                    <p className="text-xs text-muted-foreground">pub</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary">{faculty.citations}</span>
                    <p className="text-xs text-muted-foreground">cite</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Detailed Stats Table */}
      <ChartCard
        title="Department Breakdown"
        subtitle="Detailed statistics by department"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Department</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Published</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Citations</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg IF</th>
              </tr>
            </thead>
            <tbody>
              {departmentData.map((dept) => (
                <tr key={dept.department} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 px-4 font-medium">{dept.department}</td>
                  <td className="py-3 px-4 text-right">{dept.totalPublications}</td>
                  <td className="py-3 px-4 text-right text-green-600">{dept.published}</td>
                  <td className="py-3 px-4 text-right">{dept.totalCitations}</td>
                  <td className="py-3 px-4 text-right">{dept.avgImpactFactor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

export default AnalyticsPage
