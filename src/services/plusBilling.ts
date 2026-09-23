import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  isUserCancelledError,
  type Purchase,
} from 'expo-iap';

type Extra = {
  plusProductId?: string;
  privacyPolicyUrl?: string;
  supportUrl?: string;
};

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

/** App Store Connect product id (Non-Consumable or subscription). */
export const PLUS_PRODUCT_ID = 'app.paypace.plus';

export const PRIVACY_POLICY_URL =
  extra().privacyPolicyUrl?.trim() ||
  'https://iulianaiagodka.github.io/PayPace/privacy.html';

export const SUPPORT_URL =
  extra().supportUrl?.trim() || 'https://iulianaiagodka.github.io/PayPace/support.html';

/** Demo unlock is only for local/dev builds — never production store builds. */
export function allowDemoPremiumUnlock(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

export function plusProductId(): string {
  return extra().plusProductId?.trim() || PLUS_PRODUCT_ID;
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

function ownsPlus(purchases: Purchase[], sku: string): boolean {
  return purchases.some((p) => p.productId === sku);
}

async function purchasePlusProduct(sku: string): Promise<Purchase> {
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

    void requestPurchase({
      request: {
        apple: { sku },
        google: { skus: [sku] },
      },
      type: 'in-app',
    }).catch((error) => {
      finish(() => reject(error));
    });
  });
}

export async function refreshPlusEntitlement(): Promise<boolean> {
  if (!(await configurePlusBilling())) return false;
  try {
    const sku = plusProductId();
    const purchases = await getAvailablePurchases();
    return ownsPlus(purchases, sku);
  } catch {
    return false;
  }
}

export async function purchasePlus(): Promise<PlusPurchaseResult> {
  if (!(await configurePlusBilling())) {
    return {
      status: 'unavailable',
      message:
        'In-app purchases need a native iOS/Android build (TestFlight / device). Create product app.paypace.plus in App Store Connect (see RELEASE-YOU.md).',
    };
  }

  const sku = plusProductId();
  try {
    const products = await fetchProducts({ skus: [sku], type: 'in-app' });
    const list = Array.isArray(products) ? products : [];
    if (!list.length) {
      return {
        status: 'unavailable',
        message: `StoreKit found no product “${sku}”. Create it in App Store Connect and wait for it to become Available for Sale / Ready to Submit.`,
      };
    }

    const purchase = await purchasePlusProduct(sku);
    if (purchase.productId === sku) return { status: 'purchased' };
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
    const sku = plusProductId();
    const purchases = await getAvailablePurchases();
    return { status: 'restored', active: ownsPlus(purchases, sku) };
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
