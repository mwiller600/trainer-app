import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8fafc;">
      <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:32px;max-width:400px;text-align:center;">
        <div style="font-size:32px;margin-bottom:16px;">⚠️</div>
        <h2 style="color:#1e293b;margin:0 0 8px">Missing Supabase config</h2>
        <p style="color:#64748b;margin:0">VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your environment variables.</p>
      </div>
    </div>
  `
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
