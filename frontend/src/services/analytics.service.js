import api from '../lib/api'

export const analyticsService = {
  // Overview
  getOverview: async (params = {}) => {
    return api.get('/analytics/overview', { params })
  },

  // Department analytics
  getDepartments: async (params = {}) => {
    return api.get('/analytics/departments', { params })
  },

  // Monthly trends
  getMonthly: async (params = {}) => {
    return api.get('/analytics/monthly', { params })
  },

  // Yearly trends
  getYearly: async () => {
    return api.get('/analytics/yearly')
  },

  // Citation analysis
  getCitations: async (params = {}) => {
    return api.get('/analytics/citations', { params })
  },

  // Faculty leaderboard
  getLeaderboard: async (params = {}) => {
    return api.get('/analytics/leaderboard', { params })
  },

  // Research areas
  getResearchAreas: async (params = {}) => {
    return api.get('/analytics/research-areas', { params })
  },

  // Funding analytics
  getFunding: async (params = {}) => {
    return api.get('/analytics/funding', { params })
  },

  // Acceptance ratio
  getStatusRatio: async (params = {}) => {
    return api.get('/analytics/status', { params })
  },

  // Export report
  exportReport: async () => {
    return api.get('/analytics/export')
  },

  /**
   * Composite helper used by DashboardPage.
   * Fetches overview + leaderboard in parallel and merges into a single object.
   */
  getDashboardStats: async () => {
    const [overviewRes, leaderboardRes] = await Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/leaderboard', { params: { limit: 5 } }),
    ])
    return {
      overview: overviewRes.data?.data?.overview ?? {},
      topAuthors: (leaderboardRes.data?.data ?? []).map((a) => ({
        id: a.authorId,
        firstName: a.name?.split(' ')[0] ?? '',
        lastName: a.name?.split(' ').slice(1).join(' ') ?? '',
        department: a.department ?? '',
        publicationCount: a.total ?? 0,
      })),
    }
  },
}

export default analyticsService

