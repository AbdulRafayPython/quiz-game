import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
// New-style publishable key (sb_publishable_…) or legacy anon JWT — either works client-side.
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// True only when real credentials are present. When false, the app falls back to
// local stubs (static quiz data, pass-through login) so it still runs offline.
export const isSupabaseConfigured = Boolean(
  url && key && !url.includes('YOUR-PROJECT') && !/YOUR-ANON|YOUR-PUBLISHABLE/.test(key)
);

export const supabase = isSupabaseConfigured ? createClient(url, key) : null;
