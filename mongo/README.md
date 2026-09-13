# MongoDB for CampusBite

CampusBite uses **one MongoDB instance** and four logical databases:

| Database | Service |
|----------|---------|
| `campusbite_menu` | menu-service |
| `campusbite_orders` | order-service |
| `campusbite_notify` | notify-service |
| `campusbite_auth` | auth-service |

Connection settings live in each service's `MONGO_URI` (see the root [README](../README.md)). The URI includes host, port, optional username/password, and the database name.

## Local install

1. Install MongoDB Community and start `mongod` on port `27017`.
2. Default for a local install without authentication:

   `mongodb://127.0.0.1:27017/<database>`

3. If you turn authentication on, put the user and password in the URI:

   `mongodb://USERNAME:PASSWORD@127.0.0.1:27017/<database>`

   Optionally run [`init/01-create-user.js`](init/01-create-user.js) with `mongosh` after replacing the password placeholder.

Menu seed data is inserted automatically by `menu-service` when the collection is empty.
