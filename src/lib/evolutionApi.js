const API_URL = import.meta.env.VITE_EVOLUTION_API_URL
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY
const INSTANCE = import.meta.env.VITE_EVOLUTION_INSTANCE

const headers = {
  'Content-Type': 'application/json',
  'apikey': API_KEY
}

export const evolutionApi = {
  async sendText(number, text) {
    const res = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ number, text })
    })
    return res.json()
  },

  async getConnectionState() {
    const res = await fetch(`${API_URL}/instance/connectionState/${INSTANCE}`, {
      headers: { apikey: API_KEY }
    })
    return res.json()
  },

  async connect() {
    const res = await fetch(`${API_URL}/instance/connect/${INSTANCE}`, {
      headers: { apikey: API_KEY },
      cache: 'no-store'
    })
    return res.json()
  },

  async restart() {
    const res = await fetch(`${API_URL}/instance/restart/${INSTANCE}`, {
      method: 'POST',
      headers: { apikey: API_KEY }
    })
    return res.json()
  },

  async logout() {
    const res = await fetch(`${API_URL}/instance/logout/${INSTANCE}`, {
      method: 'DELETE',
      headers: { apikey: API_KEY }
    })
    return res.json()
  },

  async deleteInstance() {
    const res = await fetch(`${API_URL}/instance/delete/${INSTANCE}`, {
      method: 'DELETE',
      headers: { apikey: API_KEY }
    })
    return res.json()
  },

  async createInstance() {
    const res = await fetch(`${API_URL}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instanceName: INSTANCE,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    })
    return res.json()
  }
}
