import Constants from 'expo-constants';

/**
 * Resolve the mayo-ba backend base URL.
 *
 * In dev we point at the same machine that is serving Metro. Expo exposes that
 * machine's LAN address via `hostUri` (e.g. "192.168.0.108:8081"), so a physical
 * Android device and the emulator both reach your PC without hardcoding an IP.
 * The backend (mayo-ba) is assumed to run on DEV_BACKEND_PORT on that same
 * machine (3003 — 3000 is taken by digibate-ba on this PC).
 *
 * For production, set EXPO_PUBLIC_BACKEND_URL (e.g. in eas.json / app config) or
 * replace the fallback below with your deployed API domain.
 */
function resolveDevHost(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // older Expo Go field
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  const host = hostUri?.split(':')[0];
  return host && host.length > 0 ? host : 'localhost';
}

const DEV_BACKEND_PORT = 3003;

const PROD_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'https://server.mayo-app.com';

export const BACKEND_URL = __DEV__
  ? `http://${resolveDevHost()}:${DEV_BACKEND_PORT}`
  : PROD_BACKEND_URL;
