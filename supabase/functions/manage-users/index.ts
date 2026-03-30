import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar que el caller esté autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('[auth] Sin header Authorization')
      return json({ error: 'No autorizado' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('[env] SUPABASE_URL:', supabaseUrl ?? 'NO SETEADA')
    console.log('[env] SUPABASE_ANON_KEY:', anonKey ? 'OK' : 'NO SETEADA')
    console.log('[env] SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? 'OK' : 'NO SETEADA')

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: 'Variables de entorno faltantes', debug: { supabaseUrl: !!supabaseUrl, anonKey: !!anonKey, serviceKey: !!serviceKey } }, 500)
    }

    // Validar el JWT del usuario que llama
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    console.log('[auth] getUser result:', { userId: user?.id ?? null, error: authError?.message ?? null })
    if (authError || !user) {
      return json({ error: 'No autorizado', debug: authError?.message }, 401)
    }

    // Cliente admin — apunta a GoTrue directo para evitar problemas con Kong en self-hosted
    const authAdminUrl = Deno.env.get('SUPABASE_AUTH_ADMIN_URL') ?? supabaseUrl
    console.log('[env] authAdminUrl:', authAdminUrl)
    const adminClient = createClient(authAdminUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { action, ...payload } = await req.json()

    switch (action) {
      case 'list': {
        console.log('[action] list users')
        const { data, error } = await adminClient.auth.admin.listUsers()
        console.log('[action] list result:', { count: data?.users?.length ?? 0, error: error?.message ?? null })
        if (error) return json({ error: error.message }, 400)
        return json({ data: data.users })
      }

      case 'create': {
        const { email, password } = payload
        if (!email || !password) return json({ error: 'Email y contraseña requeridos' }, 400)
        const { data, error } = await adminClient.auth.admin.createUser({
          email: email.trim().toLowerCase(),
          password,
          email_confirm: true,
        })
        if (error) return json({ error: error.message }, 400)
        return json({ data: data.user })
      }

      case 'toggle-ban': {
        const { id, banned } = payload
        if (!id) return json({ error: 'ID requerido' }, 400)
        if (id === user.id) return json({ error: 'No podés modificar tu propio usuario' }, 400)
        const { data, error } = await adminClient.auth.admin.updateUserById(id, {
          ban_duration: banned ? 'none' : '876000h',
        })
        if (error) return json({ error: error.message }, 400)
        return json({ data: data.user })
      }

      case 'delete': {
        const { id } = payload
        if (!id) return json({ error: 'ID requerido' }, 400)
        if (id === user.id) return json({ error: 'No podés eliminarte a vos mismo' }, 400)
        const { error } = await adminClient.auth.admin.deleteUser(id)
        if (error) return json({ error: error.message }, 400)
        return json({ data: { id } })
      }

      case 'reset-password': {
        const { id, password } = payload
        if (!id || !password) return json({ error: 'ID y contraseña requeridos' }, 400)
        const { data, error } = await adminClient.auth.admin.updateUserById(id, { password })
        if (error) return json({ error: error.message }, 400)
        return json({ data: data.user })
      }

      default:
        return json({ error: `Acción desconocida: ${action}` }, 400)
    }
  } catch (err) {
    console.log('[catch] Error no controlado:', err)
    return json({ error: err.message ?? 'Error interno' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
