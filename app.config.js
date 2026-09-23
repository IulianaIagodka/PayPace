/**
 * Dynamic Expo config so EXPO_PUBLIC_* secrets from `.env` / EAS
 * are baked into `extra` at build time (TestFlight-safe).
 */
module.exports = ({ config }) => {
  const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() || '';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  const privacyPolicyUrl =
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ||
    'https://iulianaiagodka.github.io/PayPace/privacy.html';
  const supportUrl =
    process.env.EXPO_PUBLIC_SUPPORT_URL?.trim() ||
    'https://iulianaiagodka.github.io/PayPace/support.html';
  const plusProductId = process.env.EXPO_PUBLIC_PLUS_PRODUCT_ID?.trim() || 'app.paypace.plus';

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      openaiApiKey,
      supabaseUrl,
      supabaseAnonKey,
      privacyPolicyUrl,
      supportUrl,
      plusProductId,
      EXPO_PUBLIC_OPENAI_API_KEY: openaiApiKey,
      EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    },
  };
};
