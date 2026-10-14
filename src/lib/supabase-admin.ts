import { createClient } from '@supabase/supabase-js';

// Server-side only (API routes). Uses the service role key, which bypasses RLS.
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server keys are not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

// Verify the caller's access token and return their user id.
export async function userFromRequest(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
