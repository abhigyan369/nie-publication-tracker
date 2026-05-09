import api from '../lib/api'

export const authService = {
  /**
   * Login with email and password
   */
  login: async (email, password) => {
    return api.post('/auth/login', { email, password })
  },

  /**
   * Register new user account
   */
  register: async (userData) => {
    return api.post('/auth/register', userData)
  },

  /**
   * Logout current session
   */
  logout: async () => {
    return api.post('/auth/logout')
  },

  /**
   * Logout from all devices
   */
  logoutAll: async () => {
    return api.post('/auth/logout-all')
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async () => {
    return api.get('/auth/me')
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken) => {
    return api.post('/auth/refresh', { refreshToken })
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email })
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token, password) => {
    return api.post('/auth/reset-password', { token, password })
  },

  /**
   * Change password (requires current password)
   */
  changePassword: async (currentPassword, newPassword) => {
    return api.post('/auth/change-password', { currentPassword, newPassword })
  },

  /**
   * Update user profile
   */
  updateProfile: async (profileData) => {
    return api.put('/auth/profile', profileData)
  },
}

export default authService
