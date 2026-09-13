import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import type { MenuItem } from "./api";

type Props = {
  onAuthExpired: () => void;
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "",
};

export default function StaffMenu({ onAuthExpired }: Props) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const categories = useMemo(() => {
    const found = new Set(items.map((item) => item.category));
    return [...found].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const refresh = useCallback(async () => {
    try {
      setItems(await api.listAllMenu());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load menu";
      if (/staff login required|invalid or expired|not authenticated|account no longer/i.test(message)) {
        onAuthExpired();
        return;
      }
      setError(message);
    }
  }, [onAuthExpired]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleAuthError(message: string): boolean {
    if (/staff login required|invalid or expired|not authenticated|account no longer/i.test(message)) {
      onAuthExpired();
      return true;
    }
    return false;
  }

  async function addItem(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    const category = form.category.trim();
    const price = Number(form.price);
    if (!name || !category || !Number.isFinite(price) || price <= 0) return;
    setBusy(true);
    try {
      await api.createMenuItem({
        name,
        category,
        price,
        description: form.description.trim(),
      });
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add item";
      if (!handleAuthError(message)) setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function setAvailable(item: MenuItem, available: boolean) {
    setBusy(true);
    try {
      await api.updateMenuItem(item.id, { available });
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update item";
      if (!handleAuthError(message)) setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: MenuItem) {
    if (!window.confirm(`Remove ${item.name} from the menu?`)) return;
    setBusy(true);
    try {
      await api.deleteMenuItem(item.id);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not remove item";
      if (!handleAuthError(message)) setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel staff-menu-panel">
      <div className="panel-heading">
        <h2>Today's menu</h2>
      </div>
      <p className="muted">
        Hide an item when you are out of it. Guests will not see it until you
        turn it back on. Remove is only for items you no longer serve.
      </p>

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <form className="menu-editor" onSubmit={addItem}>
        <label className="field">
          Name
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Club sandwich"
            disabled={busy}
          />
        </label>
        <label className="field">
          Category
          <input
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            placeholder="Sandwiches"
            list="menu-categories"
            disabled={busy}
          />
          <datalist id="menu-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </label>
        <label className="field">
          Price (MKD)
          <input
            type="number"
            min="1"
            step="1"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="220"
            disabled={busy}
          />
        </label>
        <label className="field menu-editor-wide">
          Description
          <input
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Optional"
            disabled={busy}
          />
        </label>
        <div className="menu-editor-submit">
          <button
            type="submit"
            disabled={
              busy ||
              !form.name.trim() ||
              !form.category.trim() ||
              !Number.isFinite(Number(form.price)) ||
              Number(form.price) <= 0
            }
          >
            Add item
          </button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="muted">No items yet. Add food or drinks above.</p>
      ) : (
        <ul className="menu-list scroll-list">
          {items.map((item) => (
            <li key={item.id} className={item.available ? undefined : "menu-item-off"}>
              <div>
                <strong>{item.name}</strong>
                {item.description && <p className="muted">{item.description}</p>}
                <span className="meta">
                  {item.category} · {item.price.toFixed(0)} MKD
                </span>{" "}
                <span className={`status ${item.available ? "status-accepted" : "status-denied"}`}>
                  {item.available ? "available" : "not today"}
                </span>
              </div>
              <div className="order-buttons">
                <button
                  type="button"
                  className={item.available ? "ghost" : undefined}
                  disabled={busy}
                  onClick={() => void setAvailable(item, !item.available)}
                >
                  {item.available ? "Not today" : "Available today"}
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => void removeItem(item)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
