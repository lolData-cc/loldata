import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE returns ?code=/?error= in the query string (stable, readable in our
    // callback) instead of the implicit flow's URL hash, which auth-js strips on
    // load before we can read it — that's why OAuth errors used to vanish and the
    // user just got bounced to /login with no explanation.
    flowType: "pkce",
    // The /auth/callback route exchanges the code explicitly, so we don't want
    // auth-js auto-consuming the URL out from under us (it would race the manual
    // exchange and "use" the single-use code first).
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
})
