import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_PERSONAS_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PERSONAS_ANON_KEY

export const supabasePersonas = createClient(supabaseUrl, supabaseAnonKey)
