/**
 * Dynamic Expo config so EXPO_PUBLIC_* secrets from `.env` / EAS
 * are baked into `extra` at build time (TestFlight-safe).
 */
module.exports = ({ config }) => {
  const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() || '';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

  return {
    ...config,
    extra: {
      ...(config.extra ?? {}),
      openaiApiKey,
      supabaseUrl,
      supabaseAnonKey,
      EXPO_PUBLIC_OPENAI_API_KEY: openaiApiKey,
      EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    },
  };
};
