import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// Using service_role key - bypasses RLS completely
// This is safe for a local desktop app without auth
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
