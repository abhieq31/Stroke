// Central place to read Supabase env + decide whether the integration is
// active. The whole app degrades gracefully when these are absent: the
// predictor still works, but auth and saved history are disabled.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
