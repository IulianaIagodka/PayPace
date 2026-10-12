import Constants from 'expo-constants';

/**
 * Build-time rollout gate. Default OFF. Do not enable until authenticated
 * Create/Join, secure sync, legacy migration, and RLS rollout are tested.
 * A client flag is NOT an authorization boundary: Supabase RLS is.
 */
export function isSecureSharedBudgetEnabled(): boolean {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return (
    process.env.EXPO_PUBLIC_SECURE_SHARED_BUDGET === 'true' ||
    extra.EXPO_PUBLIC_SECURE_SHARED_BUDGET === 'true' ||
    extra.secureSharedBudget === true
  );
}
