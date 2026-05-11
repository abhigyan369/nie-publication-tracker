import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Token refresh state — prevents concurrent refresh calls ─────────────────
let isRefreshing = false
let refreshSubscribers = []

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

function subscribeToRefresh(cb) {
  refreshSubscribers.push(cb)
}

// Request interceptor — attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401 with safe, loop-proof token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    // Never retry 429 — surface it immediately
    if (status === 429) {
      return Promise.reject(error)
    }

    // Only attempt refresh on 401 and only once per original request
    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    // Don't attempt refresh if the failing request IS the refresh endpoint
    if (originalRequest.url?.includes('/auth/refresh')) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      localStorage.removeItem('token')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    originalRequest._retry = true

    // If a refresh is already in-flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeToRefresh((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          resolve(api(originalRequest))
        })
      })
    }

    isRefreshing = true

    try {
      // Use raw axios so this call is NOT intercepted by this same handler
      const response = await axios.post('/api/v1/auth/refresh', { refreshToken })
      const { token: newToken, refreshToken: newRefreshToken } = response.data.data

      localStorage.setItem('token', newToken)
      if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken)

      // Unblock all queued requests
      onRefreshed(newToken)

      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshError) {
      // Refresh failed — clear session and redirect
      refreshSubscribers = []
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

// API helper for file uploads
export const uploadFile = async (file, endpoint, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)

  const token = localStorage.getItem('token')

  const response = await axios.post(`/api/v1/${endpoint}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(percentCompleted)
      }
    },
  })

  return response.data
}

export default api
