import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesPackage,
} from 'react-native-purchases';

type Extra = {
  revenueCatIosKey?: string;
  revenueCatAndroidKey?: string;
  plusEntitlementId?: string;
  plusProductId?: string;
  privacyPolicyUrl?: string;
  supportUrl?: string;
  EXPO_PUBLIC_REVENUECAT_IOS_KEY?: string;
  EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

/** App Store / Play product id (create in App Store Connect). */
export const PLUS_PRODUCT_ID = 'app.paypace.plus';

/** RevenueCat entitlement identifier. */
export const PLUS_ENTITLEMENT_ID = 'plus';

export const PRIVACY_POLICY_URL =
  extra().privacyPolicyUrl?.trim() ||
  'https://iulianaiagodka.github.io/PayPace/privacy.html';

export const SUPPORT_URL =
  extra().supportUrl?.trim() || 'https://iulianaiagodka.github.io/PayPace/support.html';

/** Demo unlock is only for local/dev builds — never production store builds. */
export function allowDemoPremiumUnlock(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function revenueCatKey(): string {
  const e = extra();
  if (Platform.OS === 'ios') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() ||
      e.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() ||
      e.revenueCatIosKey?.trim() ||
      ''
    );
  }
  return (
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ||
    e.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ||
    e.revenueCatAndroidKey?.trim() ||
    ''
  );
}

let configured = false;

export function isPlusBillingConfigured(): boolean {
  return Boolean(revenueCatKey());
}

export async function configurePlusBilling(): Promise<boolean> {
  const apiKey = revenueCatKey();
  if (!apiKey || configured) return configured;
  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey });
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export type PlusPurchaseResult =
  | { status: 'purchased' }
  | { status: 'restored'; active: boolean }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

async function findPlusPackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return null;
  const productId = extra().plusProductId?.trim() || PLUS_PRODUCT_ID;
  return (
    current.availablePackages.find((p) => p.product.identifier === productId) ??
    current.availablePackages.find(
      (p) =>
        p.identifier.toLowerCase().includes('plus') ||
        p.product.identifier.toLowerCase().includes('plus'),
    ) ??
    current.lifetime ??
    current.annual ??
    current.monthly ??
    current.availablePackages[0] ??
    null
  );
}

export async function refreshPlusEntitlement(): Promise<boolean> {
  if (!(await configurePlusBilling())) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    const entitlementId = extra().plusEntitlementId?.trim() || PLUS_ENTITLEMENT_ID;
    return Boolean(info.entitlements.active[entitlementId]);
  } catch {
    return false;
  }
}

export async function purchasePlus(): Promise<PlusPurchaseResult> {
  if (!(await configurePlusBilling())) {
    return {
      status: 'unavailable',
      message:
        'Plus purchases are not configured in this build. Add RevenueCat + App Store product (see RELEASE-YOU.md).',
    };
  }
  try {
    const pkg = await findPlusPackage();
    if (!pkg) {
      return {
        status: 'unavailable',
        message:
          'No Plus product found in RevenueCat offerings. Attach your App Store product to the current offering.',
      };
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const entitlementId = extra().plusEntitlementId?.trim() || PLUS_ENTITLEMENT_ID;
    if (customerInfo.entitlements.active[entitlementId]) {
      return { status: 'purchased' };
    }
    return {
      status: 'error',
      message: 'Purchase finished but the Plus entitlement is not active yet.',
    };
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { status: 'cancelled' };
    }
    const message =
      error instanceof Error ? error.message : 'Could not complete the Plus purchase.';
    return { status: 'error', message };
  }
}

export async function restorePlusPurchases(): Promise<PlusPurchaseResult> {
  if (!(await configurePlusBilling())) {
    return {
      status: 'unavailable',
      message: 'Purchases are not configured in this build.',
    };
  }
  try {
    const info = await Purchases.restorePurchases();
    const entitlementId = extra().plusEntitlementId?.trim() || PLUS_ENTITLEMENT_ID;
    const active = Boolean(info.entitlements.active[entitlementId]);
    return { status: 'restored', active };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Could not restore purchases.';
    return { status: 'error', message };
  }
}

/** Shared unlock handler for Plus CTAs across screens. */
export async function unlockPlus(opts: {
  setPremium: (enabled: boolean) => Promise<void>;
  preferRestore?: boolean;
}): Promise<void> {
  if (allowDemoPremiumUnlock()) {
    await opts.setPremium(true);
    return;
  }

  const result = opts.preferRestore ? await restorePlusPurchases() : await purchasePlus();

  if (result.status === 'purchased') {
    await opts.setPremium(true);
    Alert.alert('Plus unlocked', 'Thanks — Plus features are on.');
    return;
  }
  if (result.status === 'restored') {
    if (result.active) {
      await opts.setPremium(true);
      Alert.alert('Restored', 'Your Plus purchase is active on this device.');
    } else {
      Alert.alert('Nothing to restore', 'No active Plus purchase found for this Apple ID.');
    }
    return;
  }
  if (result.status === 'cancelled') return;
  Alert.alert('Plus', result.message);
}
