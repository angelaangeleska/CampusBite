import { useState } from "react";
import { configureApi } from "./api";
import AuthView from "./AuthView";
import GuestView from "./GuestView";
import OrderHistory from "./OrderHistory";
import StaffView from "./StaffView";
import { clearAuth, loadAuth, loadGuestName, roleFromAuthResult, saveAuth, saveGuestName } from "./authSession";
import type { AuthSession } from "./authSession";
import "./App.css";

type Screen = "order" | "auth" | "kitchen" | "history" | "kitchenHistory";

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadAuth());
  const [guestName, setGuestName] = useState(() => loadGuestName());
  const [screen, setScreen] = useState<Screen>(() => {
    const loaded = loadAuth();
    if (loaded?.role === "staff") return "kitchen";
    return "order";
  });

  function applySession(next: AuthSession) {
    const resolved: AuthSession = {
      ...next,
      role: roleFromAuthResult(next.token, next.role),
    };
    saveAuth(resolved);
    setSession(resolved);
    if (resolved.role === "staff") {
      configureApi({ token: resolved.token, guestName: "" });
      setScreen("kitchen");
      return;
    }
    configureApi({ token: resolved.token, guestName: "" });
    setScreen("order");
  }

  function logout() {
    clearAuth();
    setSession(null);
    configureApi({ token: null, guestName });
    setScreen("order");
  }

  function expireCustomer() {
    clearAuth();
    setSession(null);
    setScreen("auth");
  }

  if (screen === "kitchen" && session?.role === "staff") {
    configureApi({ token: session.token, guestName: "" });
    return (
      <StaffView
        username={session.username}
        onLogout={logout}
        onOpenHistory={() => setScreen("kitchenHistory")}
        onAuthExpired={() => {
          clearAuth();
          setSession(null);
          setScreen("auth");
        }}
      />
    );
  }

  if (screen === "kitchenHistory" && session?.role === "staff") {
    configureApi({ token: session.token, guestName: "" });
    return (
      <OrderHistory
        variant="staff"
        username={session.username}
        onBack={() => setScreen("kitchen")}
        onLogout={logout}
        onAuthExpired={() => {
          clearAuth();
          setSession(null);
          setScreen("auth");
        }}
      />
    );
  }

  if (screen === "auth") {
    configureApi({ token: null, guestName: "" });
    return <AuthView onAuthenticated={applySession} onBack={() => setScreen("order")} />;
  }

  const customer = session?.role === "customer" ? session : null;
  configureApi({
    token: customer?.token ?? null,
    guestName: customer ? "" : guestName,
  });

  if (screen === "history" && customer) {
    return (
      <OrderHistory
        variant="customer"
        username={customer.username}
        onBack={() => setScreen("order")}
        onLogout={logout}
        onAuthExpired={expireCustomer}
      />
    );
  }

  return (
    <GuestView
      guestName={guestName}
      account={customer}
      onGuestNameChange={(name) => {
        setGuestName(name);
        saveGuestName(name);
        configureApi({ token: null, guestName: name });
      }}
      onLogin={() => setScreen("auth")}
      onLogout={logout}
      onOpenHistory={() => setScreen("history")}
    />
  );
}
