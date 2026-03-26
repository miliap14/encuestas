import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_ENCUESTAS_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ENCUESTAS_ANON_KEY

export const supabaseEncuestas = createClient(supabaseUrl, supabaseAnonKey)
