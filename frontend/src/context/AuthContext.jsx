import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { authService } from '../services/auth.service'
import api from '../lib/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // authLoading: true only during the boot-time session check
  const [authLoading, setAuthLoading] = useState(true)
  // loading: true during individual operations (login, register, etc.)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  // Prevent concurrent login/register submissions
  const operationInFlight = useRef(false)

  // Show toast notification
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }, [])

  // Initialize auth state from localStorage — runs once on mount
  useEffect(() => {
    let cancelled = false
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          const response = await authService.getCurrentUser()
          if (!cancelled) setUser(response.data.data)
        } catch {
          // Token invalid, expired, or server error — clear silently
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
        }
      }
      if (!cancelled) setAuthLoading(false)
    }
    initAuth()
    return () => { cancelled = true }
  }, [])

  // Login
  const login = async (email, password) => {
    if (operationInFlight.current) return
    operationInFlight.current = true
    setLoading(true)
    setError(null)
    try {
      const response = await authService.login(email, password)
      const { user: userData, token, refreshToken } = response.data.data

      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', refreshToken)

      setUser(userData)
      showToast('Welcome back!', 'success')
      return userData
    } catch (err) {
      const is429 = err.response?.status === 429
      const message = is429
        ? 'Too many login attempts. Please wait a few minutes before trying again.'
        : (err.response?.data?.message || 'Login failed. Please check your credentials.')
      setError(message)
      showToast(message, 'error')
      throw err
    } finally {
      setLoading(false)
      operationInFlight.current = false
    }
  }

  // Register
  const register = async (userData) => {
    if (operationInFlight.current) return
    operationInFlight.current = true
    setLoading(true)
    setError(null)
    try {
      const response = await authService.register(userData)
      const { user: newUser, token, refreshToken } = response.data.data

      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', refreshToken)

      setUser(newUser)
      showToast('Registration successful! Welcome to NIE Publications.', 'success')
      return newUser
    } catch (err) {
      const is429 = err.response?.status === 429
      const message = is429
        ? 'Too many registration attempts. Please wait a few minutes.'
        : (err.response?.data?.message || 'Registration failed. Please try again.')
      setError(message)
      showToast(message, 'error')
      throw err
    } finally {
      setLoading(false)
      operationInFlight.current = false
    }
  }

  // Logout
  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      setUser(null)
      showToast('You have been logged out.', 'info')
    }
  }

  // Forgot Password
  const forgotPassword = async (email) => {
    setLoading(true)
    try {
      const response = await authService.forgotPassword(email)
      showToast(response.data.message || 'Password reset instructions sent to your email.', 'success')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset instructions.'
      showToast(message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Reset Password
  const resetPassword = async (token, password) => {
    setLoading(true)
    try {
      const response = await authService.resetPassword(token, password)
      showToast('Password reset successful. Please login with your new password.', 'success')
      return response.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to reset password.'
      showToast(message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Change Password
  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      showToast('Password changed successfully.', 'success')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password.'
      showToast(message, 'error')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Update Profile
  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData)
      setUser(response.data.data)
      showToast('Profile updated successfully.', 'success')
      return response.data.data
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile.'
      showToast(message, 'error')
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        loading,
        error,
        toast,
        login,
        logout,
        register,
        forgotPassword,
        resetPassword,
        changePassword,
        updateProfile,
        showToast,
      }}
    >
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Toast Component
function Toast({ message, type, onClose }) {
  const typeStyles = {
    success: 'bg-green-500/10 border-green-500/20 text-green-600',
    error: 'bg-destructive/10 border-destructive/20 text-destructive',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600',
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 animate-slide-in-right ${typeStyles[type]}`}>
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur">
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
