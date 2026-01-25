import { createClient } from '@supabase/supabase-js';

// These should be in .env but for client-side usage in a static site,
// we often expose the URL and Anon Key.
// IMPORTANT: Enable Row Level Security (RLS) on your Supabase tables!

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Admin features will not work.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
