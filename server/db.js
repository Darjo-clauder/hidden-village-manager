import { createClient } from '@supabase/supabase-js'

let supabase = null

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
} else {
  console.warn('SUPABASE_URL / SUPABASE_ANON_KEY not set — running without persistence.')
}

export default supabase
