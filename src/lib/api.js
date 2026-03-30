import { supabaseEncuestas } from './supabaseEncuestas'

const BASE_URL = import.meta.env.VITE_API_URL

async function getAuthHeader() {
  const { data: { session } } = await supabaseEncuestas.auth.getSession()
  if (!session) throw new Error('Sin sesión activa')
  return `Bearer ${session.access_token}`
}

async function request(method, path, body) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: await getAuthHeader(),
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`)
  return json
}

export const api = {
  users: {
    list: () => request('GET', '/users'),
    search: (dni) => request('GET', `/users/search?dni=${encodeURIComponent(dni)}`),
    create: (payload) => request('POST', '/users', payload),
    setActivo: (id, activo) => request('PATCH', `/users/${id}/activo`, { activo }),
    setRol: (id, rol) => request('PATCH', `/users/${id}/rol`, { rol }),
    resetPassword: (id, password) => request('PATCH', `/users/${id}/password`, { password }),
    delete: (id) => request('DELETE', `/users/${id}`),
  },
}
