/**
 * Dynamic Expo config so EXPO_PUBLIC_* secrets from `.env` / EAS
 * are baked into `extra` at build time (TestFlight-safe).
 *
 * Also strips iOS `aps-environment`: PayPace only schedules local
 * partner-metric alerts. The expo-notifications package is still
 * auto-applied by prebuild and would otherwise force Push on the
 * App Store provisioning profile.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
}

module.exports = ({ config }) => {
  const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim() || '';
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  const privacyPolicyUrl =
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ||
    'https://iulianaiagodka.github.io/PayPace/privacy.html';
  const termsOfUseUrl =
    process.env.EXPO_PUBLIC_TERMS_OF_USE_URL?.trim() ||
    'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
  const supportUrl =
    process.env.EXPO_PUBLIC_SUPPORT_URL?.trim() ||
    'https://iulianaiagodka.github.io/PayPace/support.html';
  const plusProductId = process.env.EXPO_PUBLIC_PLUS_PRODUCT_ID?.trim() || 'app.paypace.plus';
  const plusMonthlyProductId =
    process.env.EXPO_PUBLIC_PLUS_MONTHLY_PRODUCT_ID?.trim() || 'app.paypace.plus.monthly';
  const plusYearlyProductId =
    process.env.EXPO_PUBLIC_PLUS_YEARLY_PRODUCT_ID?.trim() || 'app.paypace.plus.yearly';

  return {
    ...config,
    plugins: [...(config.plugins ?? []), withLocalNotificationsOnly],
    extra: {
      ...(config.extra ?? {}),
      openaiApiKey,
      supabaseUrl,
      supabaseAnonKey,
      privacyPolicyUrl,
      termsOfUseUrl,
      supportUrl,
      plusProductId,
      plusMonthlyProductId,
      plusYearlyProductId,
      EXPO_PUBLIC_OPENAI_API_KEY: openaiApiKey,
      EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
    },
  };
};
