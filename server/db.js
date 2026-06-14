import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

let supabase = null

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    realtime: { transport: ws }
  })
} else {
  console.warn('SUPABASE_URL / SUPABASE_ANON_KEY not set — running without persistence.')
}

export default supabase
