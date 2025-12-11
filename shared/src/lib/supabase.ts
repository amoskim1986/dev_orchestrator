import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  key: string;
}

let supabaseInstance: SupabaseClient | null = null;

/**
 * Initialize the Supabase client with the given config.
 * Should be called once at app startup.
 */
export function initSupabase(config: SupabaseConfig): SupabaseClient {
  if (!config.url || !config.key) {
    throw new Error('Missing Supabase configuration. Check your environment variables.');
  }

  supabaseInstance = createClient(config.url, config.key);
  return supabaseInstance;
}

/**
 * Get the initialized Supabase client.
 * Throws if initSupabase hasn't been called.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabaseInstance;
}

/**
 * Create a new Supabase client without storing it globally.
 * Useful for testing or one-off operations.
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (!config.url || !config.key) {
    throw new Error('Missing Supabase configuration.');
  }
  return createClient(config.url, config.key);
}
