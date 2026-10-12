import Constants from 'expo-constants';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { SharedHouseholdPayload } from '../models/types';
import { shouldSkipStaleUpsert } from './householdSyncPolicy';

type HouseholdRow = {
  id: string;
  invite_code: string;
  payload: SharedHouseholdPayload;
  updated_at: string;
  revision: number;
};

export type CloudUpsertResult = 'written' | 'skipped_stale' | 'disabled';

export { shouldSkipStaleUpsert } from './householdSyncPolicy';

function extraConfig() {
  return (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
}

const SECURE_STAGING_SUPABASE_URL = 'https://xclvzyevfsadipmupeos.supabase.co';
const SECURE_STAGING_PUBLISHABLE_KEY = 'sb_publishable_VSwkxTUDzduNCcZ4o4bz4A_ZUoFUK2B';

export function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const extra = extraConfig();
  const secureStaging =
    process.env.EXPO_PUBLIC_SECURE_SHARED_BUDGET === 'true' ||
    extra.secureSharedBudget === true ||
    extra.EXPO_PUBLIC_SECURE_SHARED_BUDGET === 'true';
  // Staging is an isolated Supabase project. Never let a production EAS
  // environment variable silently redirect secure household RPC calls.
  if (secureStaging) {
    return {
      url: SECURE_STAGING_SUPABASE_URL,
      anonKey: SECURE_STAGING_PUBLISHABLE_KEY,
    };
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || extra.EXPO_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || extra.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isCloudSyncConfigured(): boolean {
  return getSupabaseConfig() != null;
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  if (!client) {
    client = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export async function cloudFetchByInviteCode(
  inviteCode: string,
): Promise<SharedHouseholdPayload | null> {
  const sb = getClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from('households')
    .select('payload')
    .eq('invite_code', inviteCode)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.payload as SharedHouseholdPayload | undefined) ?? null;
}

export async function cloudFetchById(householdId: string): Promise<SharedHouseholdPayload | null> {
  const sb = getClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from('households')
    .select('payload')
    .eq('id', householdId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.payload as SharedHouseholdPayload | undefined) ?? null;
}

/** Write only if our revision is not behind the cloud row (avoids stomping a fresher push). */
export async function cloudUpsertPayload(
  payload: SharedHouseholdPayload,
): Promise<CloudUpsertResult> {
  const sb = getClient();
  if (!sb) return 'disabled';

  const { data: existing, error: readError } = await sb
    .from('households')
    .select('revision')
    .eq('id', payload.household.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (existing && shouldSkipStaleUpsert(payload.revision, existing.revision)) {
    return 'skipped_stale';
  }

  const row: HouseholdRow = {
    id: payload.household.id,
    invite_code: payload.household.inviteCode,
    payload,
    updated_at: payload.updatedAt,
    revision: payload.revision,
  };
  const { error } = await sb.from('households').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return 'written';
}

/** Live updates when the partner writes — no need for a tight poll. */
export function subscribeHouseholdChanges(
  householdId: string,
  onChange: () => void,
): () => void {
  const sb = getClient();
  if (!sb) return () => undefined;

  const channel: RealtimeChannel = sb
    .channel(`household-${householdId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'households',
        filter: `id=eq.${householdId}`,
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}
