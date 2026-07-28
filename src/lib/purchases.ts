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

/**
 * Buy the app subscription (current offering's first package) through the
 * native store sheet. Resolves 'cancelled' when the user backs out.
 */
export async function purchaseSubscription(): Promise<NativePurchaseResult> {
  const Purchases = await getPurchases();
  const offerings = await Purchases.getOfferings();
  const pkg = offerings.current?.availablePackages[0];
  if (!pkg) {
    throw new Error('RevenueCat: no current offering / packages configured');
  }
  try {
    await Purchases.purchasePackage(pkg);
    return 'purchased';
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return 'cancelled';
    throw e;
  }
}
