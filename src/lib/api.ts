import { BACKEND_URL } from './env';

// --- Types (mirrors mayo-ba /auth responses) ---

export interface TokenResponse {
  token: string;
  isTokenActivated: boolean;
}

export interface User {
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdventCalendarDay {
  day: number;
  isOpen: boolean;
  isMissed: boolean;
  createdAt: string;
}

export interface UserWithCalendarData {
  email: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  adventCalendar: AdventCalendarDay[];
}

/** Placeholder tag names for now — mirrors mayo-ba enum VintedItemTag. */
export const VINTED_ITEM_TAGS = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'] as const;
export type VintedItemTag = (typeof VINTED_ITEM_TAGS)[number];

export interface VintedItem {
  id: number;
  title: string;
  size: string;
  description?: string | null;
  price: number;
  priceWithShipping: number;
  sauce?: string | null;
  link: string;
  vintedItemUrls: string[];
  sauceUrls: string[];
  /** 1-24 = advent-calendar day, null = general mayo-app item */
  dayId: number | null;
  isSold: boolean;
  tags: VintedItemTag[];
  createdAt: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  token?: string;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = opts;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(0, `Network request failed: ${String(e)}`);
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = (data?.message as string) ?? message;
    } catch {
      // non-JSON error body; keep statusText
    }
    throw new ApiError(res.status, message);
  }

  // Some endpoints (e.g. boolean checks) return bare JSON; 204 returns nothing.
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// --- Auth endpoints ---

export const authApi = {
  /** POST /auth — create/login user, sends magic-link email, returns the JWT. */
  register(email: string) {
    return request<TokenResponse>('/auth', { method: 'POST', body: { email } });
  },

  /** GET /auth/check-token-status — has the magic link been clicked yet? */
  checkTokenStatus(token: string) {
    return request<boolean>('/auth/check-token-status', { token });
  },

  /** GET /auth/validate-token — returns the current user for a valid token. */
  validateToken(token: string) {
    return request<User>('/auth/validate-token', { token });
  },

  /** GET /auth/check-open-all-days */
  checkOpenAllDays(token: string) {
    return request<boolean>('/auth/check-open-all-days', { token });
  },
};

// --- Vinted items (managed in mayo-dashboard) ---

export const vintedApi = {
  /** GET /vinted-item/general — public; items without a calendar day, newest first. */
  getGeneral() {
    return request<VintedItem[]>('/vinted-item/general');
  },
};
