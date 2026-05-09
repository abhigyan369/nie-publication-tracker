import api from '../lib/api'

export const workflowService = {
  // Pending publications
  getPending: async (params = {}) => {
    return api.get('/workflow/pending', { params })
  },

  // Workflow stats
  getStats: async () => {
    return api.get('/workflow/stats')
  },

  // Status actions
  submitForReview: async (publicationId) => {
    return api.post(`/workflow/publications/${publicationId}/submit`)
  },

  approve: async (publicationId, comment) => {
    return api.post(`/workflow/publications/${publicationId}/approve`, { comment })
  },

  reject: async (publicationId, comment) => {
    return api.post(`/workflow/publications/${publicationId}/reject`, { comment })
  },

  requestRevision: async (publicationId, comment) => {
    return api.post(`/workflow/publications/${publicationId}/revision`, { comment })
  },

  markUnderReview: async (publicationId) => {
    return api.post(`/workflow/publications/${publicationId}/under-review`)
  },

  publish: async (publicationId, comment) => {
    return api.post(`/workflow/publications/${publicationId}/publish`, { comment })
  },

  // Status history & reviews
  getStatusHistory: async (publicationId) => {
    return api.get(`/workflow/publications/${publicationId}/history`)
  },

  getReviews: async (publicationId) => {
    return api.get(`/workflow/publications/${publicationId}/reviews`)
  },

  addReview: async (publicationId, comment, isInternal = false) => {
    return api.post(`/workflow/publications/${publicationId}/reviews`, { comment, isInternal })
  },

  // Soft delete & restore
  softDelete: async (publicationId) => {
    return api.delete(`/workflow/publications/${publicationId}`)
  },

  restore: async (publicationId) => {
    return api.post(`/workflow/publications/${publicationId}/restore`)
  },

  // Activity logs
  getActivityLogs: async (params = {}) => {
    return api.get('/workflow/activity-logs', { params })
  },

  // Notifications
  getNotifications: async () => {
    return api.get('/workflow/notifications')
  },

  getUnreadCount: async () => {
    return api.get('/workflow/notifications/unread-count')
  },

  markAsRead: async (notificationId) => {
    return api.post(`/workflow/notifications/${notificationId}/read`)
  },

  markAllAsRead: async () => {
    return api.post('/workflow/notifications/read-all')
  },
}

export default workflowService
