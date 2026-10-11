import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { getAuthenticatedSupabaseClient } from './householdAuthClient';

/** Apple identity token is verified by Supabase. Raw Apple credentials are never stored. */
export async function signInWithApple(): Promise<string> {
  if (Platform.OS !== 'ios') throw new Error('Sign in with Apple requires iOS.');
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) throw new Error('Sign in with Apple is not available on this device.');

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) throw new Error('Apple did not provide an identity token.');
  const sb = getAuthenticatedSupabaseClient();
  const { data, error } = await sb.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Apple sign-in did not create a session.');
  return data.user.id;
}
