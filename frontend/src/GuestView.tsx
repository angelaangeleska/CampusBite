import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api, STATUS_LABEL, notificationsForViewer, isCurrentOrder } from "./api";
import type { MenuItem, Notification, Order } from "./api";
import type { AuthSession } from "./authSession";
import { saveGuestName } from "./authSession";

type CartLine = { item: MenuItem; qty: number };

type Props = {
  guestName: string;
  account: AuthSession | null;
  onGuestNameChange: (name: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenHistory: () => void;
};

export default function GuestView({
  guestName,
  account,
  onGuestNameChange,
  onLogin,
  onLogout,
  onOpenHistory,
}: Props) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [menuItems, orderList, notes] = await Promise.all([
        api.listMenu(),
        account ? api.listOrders() : Promise.resolve([]),
        account ? api.listNotifications() : Promise.resolve([]),
      ]);
      setMenu(menuItems);
      setCart((prev) => {
        const availableIds = new Set(menuItems.map((item) => item.id));
        const next: Record<string, CartLine> = {};
        for (const [id, line] of Object.entries(prev)) {
          if (availableIds.has(id)) next[id] = line;
        }
        return next;
      });
      setOrders(orderList);
      setNotifications(notificationsForViewer(notes, "customer"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const cartTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.item.price * line.qty, 0),
    [cartLines],
  );
  const currentOrders = useMemo(
    () => orders.filter(isCurrentOrder),
    [orders],
  );
  const unread = notifications.filter((n) => !n.read).length;

  function addToCart(item: MenuItem) {
    if (!item.available) return;
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: { item, qty: existing ? existing.qty + 1 : 1 },
      };
    });
  }

  function changeQty(itemId: string, delta: number) {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const qty = existing.qty + delta;
      if (qty <= 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: { ...existing, qty } };
    });
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    const name = account?.username ?? guestName.trim();
    if (cartLines.length === 0 || !name) return;
    if (!account) {
      saveGuestName(name);
    }
    setBusy(true);
    try {
      await api.createOrder({
        customer_name: name,
        items: cartLines.map((line) => ({
          menu_item_id: line.item.id,
          qty: line.qty,
        })),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setCart({});
      setNote("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  }

  async function markRead(id: string) {
    try {
      await api.markNotificationRead(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as read");
    }
  }

  if (loading) {
    return (
      <div className="page">
        <p className="muted">Loading CampusBite…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">{account ? "Student" : "Guest order"}</p>
          <h1>CampusBite</h1>
          <p className="lede">
            {account
              ? `Signed in as ${account.username}. Track the order in progress here.`
              : "No account needed. Add food to your cart, leave a name, and the kitchen will get the order."}
          </p>
        </div>
        <div className="hero-actions">
          {account ? (
            <>
              <button type="button" className="ghost" onClick={onOpenHistory}>
                Order history
              </button>
              <button type="button" className="ghost" onClick={onLogout}>
                Log out
              </button>
            </>
          ) : (
            <button type="button" className="ghost" onClick={onLogin}>
              Log in
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className={account ? "grid" : "grid grid-guest"}>
        <section className="panel">
          <h2>Menu</h2>
          {menu.length === 0 ? (
            <p className="muted">Nothing on the menu right now.</p>
          ) : (
            <ul className="menu-list">
              {menu.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <p className="muted">{item.description}</p>
                    <span className="meta">
                      {item.category} · {item.price.toFixed(0)} MKD
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!item.available}
                    onClick={() => addToCart(item)}
                  >
                    {item.available ? "Add" : "Unavailable"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Cart</h2>
          <form onSubmit={placeOrder}>
            {account ? (
              <p className="muted">Ordering as {account.username}</p>
            ) : (
              <label className="field">
                Your name
                <input
                  value={guestName}
                  onChange={(e) => onGuestNameChange(e.target.value)}
                  placeholder="e.g. Ana"
                />
              </label>
            )}
            {cartLines.length === 0 ? (
              <p className="muted">Cart is empty.</p>
            ) : (
              <ul className="cart-list">
                {cartLines.map((line) => (
                  <li key={line.item.id}>
                    <span>
                      {line.item.name} × {line.qty}
                    </span>
                    <div className="qty">
                      <button type="button" onClick={() => changeQty(line.item.id, -1)}>
                        −
                      </button>
                      <button type="button" onClick={() => changeQty(line.item.id, 1)}>
                        +
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <label className="field">
              Note
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
                disabled={busy}
              />
            </label>
            <div className="row">
              <strong>Total: {cartTotal.toFixed(0)} MKD</strong>
              <button
                type="submit"
                disabled={
                  busy || cartLines.length === 0 || !(account || guestName.trim())
                }
              >
                Place order
              </button>
            </div>
          </form>
        </section>

        {account && (
          <section className="panel">
            <h2>Current order</h2>
            {currentOrders.length === 0 ? (
              <p className="muted">No order in progress. Place one from the cart.</p>
            ) : (
              <ul className="order-list">
                {currentOrders.map((order) => (
                  <li key={order.id}>
                    <div>
                      <p className="muted">
                        {order.items.map((i) => `${i.name}×${i.qty}`).join(", ")}
                      </p>
                      <span className={`status status-${order.status}`}>
                        {STATUS_LABEL[order.status]}
                      </span>{" "}
                      <span className="meta">{order.total.toFixed(0)} MKD</span>
                      {order.note && <p className="muted">{order.note}</p>}
                      {order.status === "denied" && order.status_reason && (
                        <p className="muted">{order.status_reason}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {account && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Notifications</h2>
              <p
                className={unread > 0 ? "live-status live-status-wait" : "live-status"}
                role="status"
                aria-live="polite"
              >
                {unread === 0
                  ? "No new alerts"
                  : unread === 1
                    ? "1 unread alert"
                    : `${unread} unread alerts`}
              </p>
            </div>
            {notifications.length === 0 ? (
              <p className="muted">No status updates yet.</p>
            ) : (
              <ul className="note-list">
                {notifications.map((note) => (
                  <li key={note.id} className={note.read ? undefined : "unread"}>
                    <div>
                      <p>{note.message}</p>
                      <span className="meta">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    {!note.read && (
                      <button type="button" onClick={() => void markRead(note.id)}>
                        Mark read
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
