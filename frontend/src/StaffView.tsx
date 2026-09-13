import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, NEXT_STATUS, STATUS_LABEL, isKitchenQueueOrder } from "./api";
import type { Order, OrderStatus } from "./api";
import StaffMenu from "./StaffMenu";

type Props = {
  username: string;
  onLogout: () => void;
  onAuthExpired: () => void;
  onOpenHistory: () => void;
};

export default function StaffView({ username, onLogout, onAuthExpired, onOpenHistory }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [denyNotes, setDenyNotes] = useState<Record<string, string>>({});
  const onAuthExpiredRef = useRef(onAuthExpired);
  onAuthExpiredRef.current = onAuthExpired;

  const refresh = useCallback(async () => {
    try {
      setOrders(await api.listOrders());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load data";
      if (/staff login required|invalid or expired|not authenticated|account no longer/i.test(message)) {
        onAuthExpiredRef.current();
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const queue = useMemo(
    () => orders.filter(isKitchenQueueOrder),
    [orders],
  );
  const pending = queue.filter((order) => order.status === "pending").length;

  async function setStatus(order: Order, next: OrderStatus, reason?: string) {
    setBusy(true);
    try {
      await api.updateOrderStatus(order.id, next, reason);
      if (next === "denied") {
        setDenyNotes((prev) => {
          const nextNotes = { ...prev };
          delete nextNotes[order.id];
          return nextNotes;
        });
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function advanceStatus(order: Order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await setStatus(order, next);
  }

  if (loading) {
    return (
      <div className="page">
        <header className="hero">
          <div>
            <p className="eyebrow">Kitchen staff</p>
            <h1>CampusBite</h1>
            <p className="lede">Signed in as {username}. Loading the queue…</p>
          </div>
          <button type="button" className="ghost" onClick={onLogout}>
            Log out
          </button>
        </header>
        {error && (
          <div className="banner error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void refresh()}>
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Kitchen staff</p>
          <h1>CampusBite</h1>
          <p className="lede">
            Signed in as {username}. Accept or deny incoming orders, update
            today's menu, then move accepted orders through prep and pickup.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="ghost" onClick={onOpenHistory}>
            Order history
          </button>
          <button type="button" className="ghost" onClick={onLogout}>
            Log out
          </button>
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

      <section className="panel">
          <div className="panel-heading">
            <h2>Kitchen queue</h2>
            <p
              className={pending > 0 ? "live-status live-status-wait" : "live-status"}
              role="status"
              aria-live="polite"
            >
              {pending === 0
                ? "No new orders waiting"
                : pending === 1
                  ? "1 new order waiting"
                  : `${pending} new orders waiting`}
            </p>
          </div>
          {queue.length === 0 ? (
            <p className="muted">No orders in today's queue.</p>
          ) : (
            <ul className="order-list scroll-list">
              {queue.map((order) => {
                const next = NEXT_STATUS[order.status];
                return (
                  <li key={order.id}>
                    <div>
                      <strong>{order.customer_name}</strong>
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
                    {order.status === "pending" ? (
                      <div className="order-actions">
                        <div className="order-buttons">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void setStatus(order, "accepted")}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            className="danger"
                            disabled={busy}
                            onClick={() =>
                              void setStatus(
                                order,
                                "denied",
                                denyNotes[order.id]?.trim() || undefined,
                              )
                            }
                          >
                            Deny
                          </button>
                        </div>
                        <input
                          className="note-input"
                          value={denyNotes[order.id] ?? ""}
                          onChange={(e) =>
                            setDenyNotes((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          placeholder="Optional note"
                          disabled={busy}
                        />
                      </div>
                    ) : (
                      next && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void advanceStatus(order)}
                        >
                          Mark {STATUS_LABEL[next]}
                        </button>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      <StaffMenu onAuthExpired={onAuthExpired} />
    </div>
  );
}
