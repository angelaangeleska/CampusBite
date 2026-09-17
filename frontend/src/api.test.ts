import { describe, expect, it } from "vitest";
import {
  NEXT_STATUS,
  isCurrentOrder,
  isHistoryOrder,
  notificationsForViewer,
  type Notification,
  type Order,
} from "./api";

const notes: Notification[] = [
  {
    id: "1",
    type: "order.placed",
    message: "New order",
    read: false,
    created_at: "2026-09-18T10:00:00Z",
  },
  {
    id: "2",
    type: "order.status_changed",
    message: "Ready",
    read: false,
    created_at: "2026-09-18T10:05:00Z",
  },
];

function order(status: Order["status"]): Order {
  return {
    id: "o1",
    customer_name: "Ana",
    items: [{ menu_item_id: "m1", name: "Soup", price: 140, qty: 1 }],
    status,
    total: 140,
    created_at: "2026-09-18T10:00:00Z",
    updated_at: "2026-09-18T10:00:00Z",
  };
}

describe("notificationsForViewer", () => {
  it("shows new orders to kitchen staff", () => {
    expect(notificationsForViewer(notes, "staff").map((note) => note.id)).toEqual(["1"]);
  });

  it("shows status changes to students", () => {
    expect(notificationsForViewer(notes, "customer").map((note) => note.id)).toEqual(["2"]);
  });
});

describe("order status helpers", () => {
  it("keeps a preparing order in the current list", () => {
    expect(isCurrentOrder(order("preparing"))).toBe(true);
    expect(isHistoryOrder(order("preparing"))).toBe(false);
  });

  it("moves picked-up orders to history", () => {
    expect(isCurrentOrder(order("picked_up"))).toBe(false);
    expect(isHistoryOrder(order("picked_up"))).toBe(true);
  });

  it("advances accepted orders to preparing", () => {
    expect(NEXT_STATUS.accepted).toBe("preparing");
  });
});
