import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './householdCloud';

let authenticatedClient: SupabaseClient | null = null;

/** Separate from legacy anonymous client until the staged migration is complete. */
export function getAuthenticatedSupabaseClient(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase URL and public key are required.');
  if (!authenticatedClient) {
    authenticatedClient = createClient(config.url, config.anonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return authenticatedClient;
}

export async function requireHouseholdUserId(): Promise<string> {
  const { data, error } = await getAuthenticatedSupabaseClient().auth.getUser();
  if (error || !data.user) throw new Error('Sign in with Apple to share a budget.');
  return data.user.id;
}
