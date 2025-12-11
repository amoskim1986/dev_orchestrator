// Re-export from shared package
// Note: Supabase is initialized in main.tsx using initSupabase()
export { getSupabase, initSupabase, createSupabaseClient } from '@dev-orchestrator/shared';

// Backward compatibility: export supabase as an alias for getSupabase()
// This allows existing code that imports { supabase } to continue working
import { getSupabase } from '@dev-orchestrator/shared';
export const supabase = {
  from: (...args: Parameters<ReturnType<typeof getSupabase>['from']>) => getSupabase().from(...args),
};
