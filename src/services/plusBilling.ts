import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  hasActiveSubscriptions,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  isUserCancelledError,
  type ProductSubscription,
  type Purchase,
} from 'expo-iap';

export type PlusPlan = 'monthly' | 'yearly';

type Extra = {
  plusProductId?: string;
  plusMonthlyProductId?: string;
  plusYearlyProductId?: string;
  privacyPolicyUrl?: string;
  termsOfUseUrl?: string;
  supportUrl?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

/** Auto-renewable subscription product ids (App Store Connect). */
export const PLUS_MONTHLY_PRODUCT_ID = 'app.paypace.plus.monthly';
export const PLUS_YEARLY_PRODUCT_ID = 'app.paypace.plus.yearly';

/** Legacy one-time / single SKU — still accepted on restore if present. */
export const PLUS_LEGACY_PRODUCT_ID = 'app.paypace.plus';

export const PRIVACY_POLICY_URL =
  extra().privacyPolicyUrl?.trim() ||
  'https://iulianaiagodka.github.io/PayPace/privacy.html';

/** Terms of Use (EULA) — Apple standard EULA (same as Rhythma App Store Description). */
export const TERMS_OF_USE_URL =
  extra().termsOfUseUrl?.trim() ||
  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export const SUPPORT_URL =
  extra().supportUrl?.trim() || 'https://iulianaiagodka.github.io/PayPace/support.html';

/** Demo unlock is only for local/dev builds — never production store builds. */
export function allowDemoPremiumUnlock(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export function plusMonthlyProductId(): string {
  return extra().plusMonthlyProductId?.trim() || PLUS_MONTHLY_PRODUCT_ID;
}

export function plusYearlyProductId(): string {
  return extra().plusYearlyProductId?.trim() || PLUS_YEARLY_PRODUCT_ID;
}

export function plusProductIdForPlan(plan: PlusPlan): string {
  return plan === 'yearly' ? plusYearlyProductId() : plusMonthlyProductId();
}

/** All Plus SKUs that unlock entitlement (subs + legacy). */
export function plusEntitlementProductIds(): string[] {
  const legacy = extra().plusProductId?.trim() || PLUS_LEGACY_PRODUCT_ID;
  return [...new Set([plusMonthlyProductId(), plusYearlyProductId(), legacy])];
}

export function plusSubscriptionProductIds(): string[] {
  return [plusMonthlyProductId(), plusYearlyProductId()];
}

/** StoreKit / Play Billing — available on native device builds (not Expo Go web). */
export function isPlusBillingConfigured(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

let connectionReady = false;

export async function configurePlusBilling(): Promise<boolean> {
  if (!isPlusBillingConfigured()) return false;
  if (connectionReady) return true;
  try {
    await initConnection();
    connectionReady = true;
    return true;
  } catch {
    connectionReady = false;
    return false;
  }
}

export type PlusPurchaseResult =
  | { status: 'purchased' }
  | { status: 'restored'; active: boolean }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

function ownsPlusSku(productId: string | null | undefined): boolean {
  if (!productId) return false;
  return plusEntitlementProductIds().includes(productId);
}

function ownsPlusFromPurchases(purchases: Purchase[]): boolean {
  return purchases.some((p) => ownsPlusSku(p.productId));
}

async function purchasePlusSubscription(sku: string, product: ProductSubscription): Promise<Purchase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      updateSub.remove();
      errorSub.remove();
      fn();
    };

    const updateSub = purchaseUpdatedListener((purchase) => {
      finish(() => {
        void (async () => {
          try {
            await finishTransaction({ purchase, isConsumable: false });
            resolve(purchase);
          } catch (error) {
            reject(error);
          }
        })();
      });
    });

    const errorSub = purchaseErrorListener((error) => {
      finish(() => reject(error));
    });

    const androidOffers =
      Platform.OS === 'android'
        ? (product.subscriptionOffers ?? [])
            .map((offer) => {
              const token =
                'offerTokenAndroid' in offer
                  ? (offer as { offerTokenAndroid?: string | null }).offerTokenAndroid
                  : null;
              if (!token) return null;
              return { sku, offerToken: token };
            })
            .filter(Boolean)
        : null;

    void requestPurchase({
      request: {
        apple: { sku },
        google: {
          skus: [sku],
          ...(androidOffers?.length ? { subscriptionOffers: androidOffers as { sku: string; offerToken: string }[] } : {}),
        },
      },
      type: 'subs',
    }).catch((error) => {
      finish(() => reject(error));
    });
  });
}

export async function refreshPlusEntitlement(): Promise<boolean> {
  if (!(await configurePlusBilling())) return false;
  try {
    const subIds = plusSubscriptionProductIds();
    if (await hasActiveSubscriptions(subIds)) return true;

    const purchases = await getAvailablePurchases();
    return ownsPlusFromPurchases(purchases);
  } catch {
    return false;
  }
}

export async function fetchPlusSubscriptionProducts(): Promise<ProductSubscription[]> {
  if (!(await configurePlusBilling())) return [];
  try {
    const products = await fetchProducts({
      skus: plusSubscriptionProductIds(),
      type: 'subs',
    });
    return (Array.isArray(products) ? products : []) as ProductSubscription[];
  } catch {
    return [];
  }
}

export async function purchasePlus(plan: PlusPlan = 'monthly'): Promise<PlusPurchaseResult> {
  if (!(await configurePlusBilling())) {
    return {
      status: 'unavailable',
      message:
        'In-app purchases need a native iOS/Android build (TestFlight / device). Create Plus subscriptions in App Store Connect (see RELEASE-YOU.md).',
    };
  }

  const sku = plusProductIdForPlan(plan);
  try {
    const products = await fetchPlusSubscriptionProducts();
    const product = products.find((p) => p.id === sku);
    if (!product) {
      return {
        status: 'unavailable',
        message: `StoreKit found no subscription “${sku}”. Create monthly + yearly Auto-Renewable Subscriptions in App Store Connect and wait until they are Ready to Submit.`,
      };
    }

    const purchase = await purchasePlusSubscription(sku, product);
    if (ownsPlusSku(purchase.productId)) return { status: 'purchased' };
    return {
      status: 'error',
      message: 'Purchase finished but Plus was not found on the receipt.',
    };
  } catch (error: unknown) {
    if (isUserCancelledError(error)) return { status: 'cancelled' };
    const message =
      error instanceof Error ? error.message : 'Could not complete the Plus purchase.';
    return { status: 'error', message };
  }
}

export async function restorePlusPurchases(): Promise<PlusPurchaseResult> {
  if (!(await configurePlusBilling())) {
    return {
      status: 'unavailable',
      message: 'Restore needs a native App Store build on a device.',
    };
  }
  try {
    await restorePurchases();
    const active = await refreshPlusEntitlement();
    return { status: 'restored', active };
  } catch (error: unknown) {
    if (isUserCancelledError(error)) return { status: 'cancelled' };
    const message =
      error instanceof Error ? error.message : 'Could not restore purchases.';
    return { status: 'error', message };
  }
}

/** Shared unlock handler for Plus CTAs across screens. */
export async function unlockPlus(opts: {
  setPremium: (enabled: boolean) => Promise<void>;
  preferRestore?: boolean;
  plan?: PlusPlan;
}): Promise<void> {
  if (allowDemoPremiumUnlock()) {
    await opts.setPremium(true);
    return;
  }

  const result = opts.preferRestore
    ? await restorePlusPurchases()
    : await purchasePlus(opts.plan ?? 'monthly');

  if (result.status === 'purchased') {
    await opts.setPremium(true);
    Alert.alert('Plus unlocked', 'Thanks — your Plus subscription is active.');
    return;
  }
  if (result.status === 'restored') {
    if (result.active) {
      await opts.setPremium(true);
      Alert.alert('Restored', 'Your Plus subscription is active on this device.');
    } else {
      Alert.alert('Nothing to restore', 'No active Plus subscription found for this Apple ID.');
    }
    return;
  }
  if (result.status === 'cancelled') return;
  Alert.alert('Plus', result.message);
}
