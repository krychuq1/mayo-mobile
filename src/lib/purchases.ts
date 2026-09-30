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
// In-flight identifyPurchaser(); read helpers await it so a screen that
// mounts right after sign-in doesn't race the (un-awaited) configure call.
let identifying: Promise<void> | null = null;

async function getPurchases() {
  // Synchronous require on purpose (not `import()`): Metro would otherwise
  // split this into a lazy chunk that the iOS dev client fails to register
  // ("Requiring unknown module <n>", seen 2026-09-28). The module stays in
  // the main bundle but is only evaluated here, so Expo Go (which never gets
  // past nativeBillingAvailable()) still never touches the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-purchases') as typeof import('react-native-purchases');
  return mod.default;
}

/**
 * Configure RevenueCat with the signed-in user's email as the app_user_id,
 * so backend webhook events can be mapped straight onto our User table.
 * Safe to call repeatedly; no-op without a key or in Expo Go.
 */
export function identifyPurchaser(email: string): Promise<void> {
  if (!nativeBillingAvailable()) return Promise.resolve();
  identifying = (async () => {
    const Purchases = await getPurchases();
    if (!configured) {
      Purchases.configure({ apiKey: API_KEY!, appUserID: email });
      configured = true;
      return;
    }
    const current = await Purchases.getAppUserID();
    if (current !== email) await Purchases.logIn(email);
  })();
  return identifying;
}

/** True once the SDK is usable (waits for a pending identify, swallows its error). */
async function sdkReady(): Promise<boolean> {
  if (!nativeBillingAvailable()) return false;
  if (identifying) await identifying.catch(() => {});
  return configured;
}

export type SubscriptionPrice = {
  /** Store-localized, VAT-inclusive, e.g. "54,99 zł" — what the user is charged. */
  priceString: string;
  price: number;
  currencyCode: string;
};

let cachedPrice: SubscriptionPrice | null = null;

/**
 * The real store price of the subscription package (current offering, first
 * package). The Play base plan is the source of truth — never hardcode it in
 * UI. Null in Expo Go / unconfigured / no offering; cached after first success.
 */
export async function getSubscriptionPrice(): Promise<SubscriptionPrice | null> {
  if (cachedPrice) return cachedPrice;
  if (!(await sdkReady())) return null;
  const Purchases = await getPurchases();
  const offerings = await withTimeout(Purchases.getOfferings(), 15_000, 'getOfferings');
  const product = offerings.current?.availablePackages[0]?.product;
  if (!product) return null;
  cachedPrice = {
    priceString: product.priceString,
    price: product.price,
    currencyCode: product.currencyCode,
  };
  return cachedPrice;
}

export type NativePurchaseResult = 'purchased' | 'cancelled';

/**
 * RevenueCat entitlement id granted by the mayo_monthly product.
 * ⚠️ NOT "access": the dashboard wizard auto-named it from the project name and
 * the separators are U+2024 ONE DOT LEADER (not ASCII periods) — verified via
 * RevenueCat's API on 2026-09-28 (entitlement entl675c3a63b4).
 */
const ENTITLEMENT_ID = 'com\u2024mayoapp\u2024mobile Pro';

export type SubscriptionInfo = {
  /** When the current period ends — next charge if `willRenew`, else access end. */
  expirationDate: Date | null;
  willRenew: boolean;
  /** 'TRIAL' | 'INTRO' | 'NORMAL' (RevenueCat period type). */
  periodType: string;
};

/**
 * Store-side view of the active subscription (billing date, auto-renew) —
 * mayo-ba only knows "has access", RevenueCat knows the schedule. Returns
 * null in Expo Go, before configure(), or when nothing is active.
 */
export async function getSubscriptionInfo(): Promise<SubscriptionInfo | null> {
  if (!(await sdkReady())) return null;
  const Purchases = await getPurchases();
  const info = await withTimeout(Purchases.getCustomerInfo(), 15_000, 'getCustomerInfo');
  const active = info.entitlements.active;
  const ent = active[ENTITLEMENT_ID] ?? Object.values(active)[0];
  if (!ent) return null;
  return {
    expirationDate: ent.expirationDate ? new Date(ent.expirationDate) : null,
    willRenew: ent.willRenew,
    periodType: ent.periodType,
  };
}

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
  // The Android bridge rejects with (code, message, infoMap) → RN exposes the
  // map as `error.userInfo` (readableErrorCode, underlyingErrorMessage = the
  // raw Play Billing response). Older code read them off the root and lost them.
  const err = e as {
    message?: string;
    code?: string | number;
    userCancelled?: boolean;
    underlyingErrorMessage?: string;
    readableErrorCode?: string;
    userInfo?: Record<string, unknown>;
  };
  const info = err?.userInfo ?? {};
  return JSON.stringify({
    message: err?.message ?? String(e),
    code: err?.code,
    readableErrorCode: err?.readableErrorCode ?? info.readableErrorCode,
    userCancelled: err?.userCancelled,
    underlying: err?.underlyingErrorMessage ?? info.underlyingErrorMessage,
    userInfo: info,
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
