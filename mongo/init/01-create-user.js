# Optional: run with mongosh after enabling MongoDB authentication.
# Replace PASSWORD (and the username if you want a different one) first.

db = db.getSiblingDB("admin");

try {
  db.createUser({
    user: "campusbite",
    pwd: "PASSWORD",
    roles: [
      { role: "readWrite", db: "campusbite_menu" },
      { role: "readWrite", db: "campusbite_orders" },
      { role: "readWrite", db: "campusbite_notify" },
      { role: "readWrite", db: "campusbite_auth" }
    ]
  });
} catch (e) {
  print("User may already exist: " + e);
}

db.getSiblingDB("campusbite_menu").createCollection("menu_items");
db.getSiblingDB("campusbite_orders").createCollection("orders");
db.getSiblingDB("campusbite_notify").createCollection("notifications");
db.getSiblingDB("campusbite_auth").createCollection("users");
