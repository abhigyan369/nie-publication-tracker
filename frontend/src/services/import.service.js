import api from '../lib/api'

const importService = {
  previewImport: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response
  },

  executeImport: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/import/execute', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response
  },

  downloadTemplate: async () => {
    const response = await api.get('/import/template', {
      responseType: 'blob',
    })
    return response
  },

  getHistory: async () => {
    const response = await api.get('/import/history')
    return response
  },
}

export default importService