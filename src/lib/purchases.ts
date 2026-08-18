import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * RevenueCat wrapper for the store-billed app subscription.
 *
 * react-native-purchases is a native module, so it only works in a development
 * build / store build — never in Expo Go. All entry points are guarded by
 * `nativeBillingAvailable()` and the module is imported lazily so the app
 * still runs (with the Stripe browser fallback) when RevenueCat isn't set up.
 *
 * API keys come from env (EXPO_PUBLIC_REVENUECAT_ANDROID_KEY /
 * EXPO_PUBLIC_REVENUECAT_IOS_KEY — RevenueCat public SDK keys, safe to ship).
 */

const API_KEY = Platform.select({
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
});

const isExpoGo = Constants.appOwnership === 'expo';

export function nativeBillingAvailable(): boolean {
  return Boolean(API_KEY) && !isExpoGo;
}

let configured = false;

async function getPurchases() {
  const Purchases = (await import('react-native-purchases')).default;
  return Purchases;
}

/**
 * Configure RevenueCat with the signed-in user's email as the app_user_id,
 * so backend webhook events can be mapped straight onto our User table.
 * Safe to call repeatedly; no-op without a key or in Expo Go.
 */
export async function identifyPurchaser(email: string): Promise<void> {
  if (!nativeBillingAvailable()) return;
  const Purchases = await getPurchases();
  if (!configured) {
    Purchases.configure({ apiKey: API_KEY!, appUserID: email });
    configured = true;
    return;
  }
  const current = await Purchases.getAppUserID();
  if (current !== email) await Purchases.logIn(email);
}

export type NativePurchaseResult = 'purchased' | 'cancelled';

/** Reject after `ms` so a wedged native call can't spin the UI forever. */
function withTimeout<T>(p: Promise<T>, ms: number, step: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`timeout after ${ms}ms in ${step}`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Flatten a RevenueCat/unknown error into a loggable one-liner. RC errors
 * carry non-enumerable fields, so plain JSON.stringify would drop them.
 */
export function describePurchaseError(e: unknown): string {
  const err = e as {
    message?: string;
    code?: string | number;
    userCancelled?: boolean;
    underlyingErrorMessage?: string;
    readableErrorCode?: string;
  };
  return JSON.stringify({
    message: err?.message ?? String(e),
    code: err?.code,
    readableErrorCode: err?.readableErrorCode,
    userCancelled: err?.userCancelled,
    underlying: err?.underlyingErrorMessage,
  });
}

/**
 * Buy the app subscription (current offering's first package) through the
 * native store sheet. Resolves 'cancelled' when the user backs out.
 * `log` gets a breadcrumb per step so a hang is attributable remotely.
 */
export async function purchaseSubscription(
  log: (message: string) => void = () => {},
): Promise<NativePurchaseResult> {
  const Purchases = await getPurchases();
  log(`configured=${await Purchases.isConfigured()}`);

  const offerings = await withTimeout(
    Purchases.getOfferings(),
    30_000,
    'getOfferings',
  );
  const pkg = offerings.current?.availablePackages[0];
  log(
    `offerings: current=${offerings.current?.identifier ?? 'null'} ` +
      `packages=${offerings.current?.availablePackages.length ?? 0} ` +
      `pkg=${pkg?.product.identifier ?? 'none'}`,
  );
  if (!pkg) {
    throw new Error('RevenueCat: no current offering / packages configured');
  }
  try {
    // Generous timeout — the user is interacting with the Play sheet here.
    await withTimeout(Purchases.purchasePackage(pkg), 300_000, 'purchasePackage');
    log('purchasePackage: done');
    return 'purchased';
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) {
      log('purchasePackage: user cancelled');
      return 'cancelled';
    }
    throw e;
  }
}
