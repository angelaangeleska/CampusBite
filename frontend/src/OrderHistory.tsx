import { useCallback, useEffect, useState } from "react";
import { api, STATUS_LABEL, isHistoryOrder, isStaffHistoryOrder } from "./api";
import type { Order } from "./api";

type Props = {
  username: string;
  variant: "customer" | "staff";
  onBack: () => void;
  onLogout: () => void;
  onAuthExpired: () => void;
};

export default function OrderHistory({
  username,
  variant,
  onBack,
  onLogout,
  onAuthExpired,
}: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const staff = variant === "staff";

  const refresh = useCallback(async () => {
    try {
      const all = await api.listOrders();
      setOrders(all.filter(staff ? isStaffHistoryOrder : isHistoryOrder));
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load history";
      if (/staff login required|invalid or expired|not authenticated|account no longer|log in/i.test(message)) {
        onAuthExpired();
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [onAuthExpired, staff]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">{staff ? "Kitchen staff" : "Student"}</p>
          <h1>Order history</h1>
          <p className="lede">
            {staff
              ? `Signed in as ${username}. Finished orders from previous days are kept here so today's queue stays short.`
              : `Signed in as ${username}. Picked-up orders live here. Active orders stay on the menu page until they are picked up.`}
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="ghost" onClick={onBack}>
            {staff ? "Back to kitchen" : "Back to menu"}
          </button>
          <button type="button" className="ghost" onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      <section className="panel">
        <h2>{staff ? "Previous days" : "Past orders"}</h2>
        {loading ? (
          <p className="muted">Loading history…</p>
        ) : orders.length === 0 ? (
          <p className="muted">
            {staff ? "No finished orders from previous days." : "No picked-up orders yet."}
          </p>
        ) : (
          <ul className="order-list scroll-list scroll-list-tall">
            {orders.map((order) => (
              <li key={order.id}>
                <div>
                  {staff && <strong>{order.customer_name}</strong>}
                  <p className="muted">
                    {order.items.map((i) => `${i.name}×${i.qty}`).join(", ")}
                  </p>
                  <span className={`status status-${order.status}`}>
                    {STATUS_LABEL[order.status]}
                  </span>{" "}
                  <span className="meta">{order.total.toFixed(0)} MKD</span>
                  <p className="meta">{new Date(order.created_at).toLocaleString()}</p>
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
    </div>
  );
}
