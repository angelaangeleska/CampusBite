export type Role = "customer" | "staff";

export type AuthSession = {
  token: string;
  username: string;
  role: Role;
};

const TOKEN_KEY = "campusbite.token";
const USER_KEY = "campusbite.username";
const ROLE_KEY = "campusbite.role";
const GUEST_KEY = "campusbite.guestName";

function roleFromToken(token: string): Role | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      role?: string;
    };
    if (payload.role === "staff" || payload.role === "customer") {
      return payload.role;
    }
  } catch {
    /* ignore malformed tokens */
  }
  return null;
}

export function loadAuth(): AuthSession | null {
  const token = localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem("campusbite.staffToken");
  const username =
    localStorage.getItem(USER_KEY) ?? localStorage.getItem("campusbite.staffUsername");
  if (!token || !username) return null;
  const storedRole = localStorage.getItem(ROLE_KEY);
  const role: Role =
    roleFromToken(token) ??
    (storedRole === "staff" || storedRole === "customer" ? storedRole : "customer");
  return { token, username, role };
}

export function roleFromAuthResult(token: string, reported?: string): Role {
  if (reported === "staff" || reported === "customer") {
    return reported;
  }
  return roleFromToken(token) ?? "customer";
}

export function saveAuth(auth: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, auth.username);
  localStorage.setItem(ROLE_KEY, auth.role);
  localStorage.removeItem("campusbite.staffToken");
  localStorage.removeItem("campusbite.staffUsername");
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem("campusbite.staffToken");
  localStorage.removeItem("campusbite.staffUsername");
}

export function loadGuestName(): string {
  return localStorage.getItem(GUEST_KEY) ?? "";
}

export function saveGuestName(name: string): void {
  localStorage.setItem(GUEST_KEY, name);
}
