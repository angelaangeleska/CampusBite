export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
};

export type OrderStatus =
  | "pending"
  | "accepted"
  | "denied"
  | "preparing"
  | "ready"
  | "picked_up";

export type Order = {
  id: string;
  customer_name: string;
  customer_username?: string | null;
  items: { menu_item_id: string; name: string; price: number; qty: number }[];
  status: OrderStatus;
  status_reason?: string | null;
  note?: string | null;
  total: number;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  type: string;
  order_id?: string | null;
  customer_name?: string | null;
  message: string;
  read: boolean;
  created_at: string;
};

export function notificationsForViewer(
  notes: Notification[],
  viewer: "staff" | "customer",
): Notification[] {
  if (viewer === "staff") {
    return notes.filter((note) => note.type === "order.new" || note.type === "order.placed");
  }
  return notes.filter((note) => note.type === "order.status_changed");
}

export type TokenResponse = {
  access_token: string;
  token_type: string;
  username: string;
  role: "customer" | "staff";
};

function browserApiBase(envValue: string | undefined, devFallback: string): string {
  if (import.meta.env.DEV) {
    return (envValue ?? devFallback).replace(/\/$/, "");
  }
  return (envValue || "").replace(/\/$/, "");
}

const MENU_API = browserApiBase(import.meta.env.VITE_MENU_API_URL, "http://127.0.0.1:8001");
const ORDER_API = browserApiBase(import.meta.env.VITE_ORDER_API_URL, "http://127.0.0.1:8002");
const NOTIFY_API = browserApiBase(import.meta.env.VITE_NOTIFY_API_URL, "http://127.0.0.1:8003");
const AUTH_API = browserApiBase(import.meta.env.VITE_AUTH_API_URL, "http://127.0.0.1:8004");

type ApiContext = {
  token: string | null;
  guestName: string;
};

let apiContext: ApiContext = { token: null, guestName: "" };

export function configureApi(context: ApiContext): void {
  apiContext = context;
}

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    if (typeof parsed.detail === "string") {
      return parsed.detail;
    }
  } catch {
    /* body was not JSON */
  }
  return text || `HTTP ${response.status}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiContext.token) {
    headers.Authorization = `Bearer ${apiContext.token}`;
  }
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
      signal: init?.signal ?? AbortSignal.timeout(8000),
    });
  } catch (err) {
    if (err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError")) {
      throw new Error("Could not reach the server. Are the APIs running?");
    }
    throw err;
  }
  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  listMenu: () =>
    request<MenuItem[]>(`${MENU_API}/api/menu/items?available_only=true`),
  listAllMenu: () => request<MenuItem[]>(`${MENU_API}/api/menu/items`),
  createMenuItem: (body: {
    name: string;
    description: string;
    price: number;
    category: string;
  }) =>
    request<MenuItem>(`${MENU_API}/api/menu/items`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateMenuItem: (itemId: string, body: Partial<Omit<MenuItem, "id">>) =>
    request<MenuItem>(`${MENU_API}/api/menu/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteMenuItem: (itemId: string) =>
    request<void>(`${MENU_API}/api/menu/items/${itemId}`, {
      method: "DELETE",
    }),
  listOrders: () => {
    if (!apiContext.token) {
      return Promise.resolve([]);
    }
    return request<Order[]>(`${ORDER_API}/api/orders`);
  },
  createOrder: (body: {
    customer_name: string;
    items: { menu_item_id: string; qty: number }[];
    note?: string;
  }) =>
    request<Order>(`${ORDER_API}/api/orders`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateOrderStatus: (orderId: string, status: OrderStatus, reason?: string) =>
    request<Order>(`${ORDER_API}/api/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(reason ? { status, reason } : { status }),
    }),
  listNotifications: () => {
    if (!apiContext.token) {
      return Promise.resolve([]);
    }
    return request<Notification[]>(
      `${NOTIFY_API}/api/notifications?${new URLSearchParams({ limit: "40" })}`,
    );
  },
  markNotificationRead: (id: string) =>
    request<Notification>(`${NOTIFY_API}/api/notifications/${id}/read`, {
      method: "PATCH",
    }),
  register: (username: string, password: string, role: "customer" | "staff") =>
    request<TokenResponse>(`${AUTH_API}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    }),
  login: (username: string, password: string) =>
    request<TokenResponse>(`${AUTH_API}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ username: string; role: "customer" | "staff" }>(`${AUTH_API}/api/auth/me`),
};

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  accepted: "preparing",
  preparing: "ready",
  ready: "picked_up",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "waiting",
  accepted: "accepted",
  denied: "denied",
  preparing: "preparing",
  ready: "ready",
  picked_up: "picked up",
};

export function isCurrentOrder(order: Order): boolean {
  return order.status !== "picked_up";
}

export function isHistoryOrder(order: Order): boolean {
  return order.status === "picked_up";
}

const IN_PROGRESS: OrderStatus[] = ["pending", "accepted", "preparing", "ready"];

export function startOfLocalDay(date = new Date()): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function isPreviousDay(iso: string): boolean {
  return new Date(iso) < startOfLocalDay();
}

export function isKitchenQueueOrder(order: Order): boolean {
  if (IN_PROGRESS.includes(order.status)) return true;
  return !isPreviousDay(order.created_at);
}

export function isStaffHistoryOrder(order: Order): boolean {
  return isPreviousDay(order.created_at) && !IN_PROGRESS.includes(order.status);
}
