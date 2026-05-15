import axios from 'axios'

const authHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const chatService = {
  sendMessage: async ({ message, sessionId }) => {
    const response = await axios.post(
      '/api/chat',
      { message, sessionId },
      {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
      }
    )

    return response.data?.data
  },

  getHistory: async () => {
    const response = await axios.get('/api/chat/history', {
      headers: authHeaders(),
    })

    return response.data?.data ?? []
  },
}

export default chatService
