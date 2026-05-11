import api from '../lib/api'

export const publicationService = {
  /**
   * Get all publications with filters
   */
  getAll: async (params = {}) => {
    return api.get('/publications', { params })
  },

  /**
   * Get autocomplete suggestions for search
   */
  getSuggestions: async (q, limit = 8) => {
    return api.get('/publications/suggestions', { params: { q, limit } })
  },

  /**
   * Get publication statistics
   */
  getStats: async () => {
    return api.get('/publications/stats')
  },

  /**
   * Get single publication
   */
  getById: async (id) => {
    return api.get(`/publications/${id}`)
  },

  /**
   * Create new publication
   */
  create: async (data) => {
    return api.post('/publications', data)
  },

  /**
   * Update publication
   */
  update: async (id, data) => {
    return api.put(`/publications/${id}`, data)
  },

  /**
   * Delete publication
   */
  delete: async (id) => {
    return api.delete(`/publications/${id}`)
  },

  /**
   * Upload publication file
   */
  uploadFile: async (id, file, fileType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileType', fileType)

    return api.post(`/publications/${id}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Co-author operations
  addCoAuthor: async (publicationId, data) => {
    return api.post(`/publications/${publicationId}/coauthors`, data)
  },

  updateCoAuthor: async (publicationId, coauthorId, data) => {
    return api.put(`/publications/${publicationId}/coauthors/${coauthorId}`, data)
  },

  removeCoAuthor: async (publicationId, coauthorId) => {
    return api.delete(`/publications/${publicationId}/coauthors/${coauthorId}`)
  },
}

export default publicationService
