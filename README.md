# CampusBite

Campus cafeteria ordering. Guests order with a name. Students can register to track the current order and history after pickup. Staff log in to manage today’s menu and the kitchen queue (`pending` → accept/deny → `preparing` → `ready` → `picked_up`).

| Folder | Port |
|--------|------|
| `frontend/` | 5173 |
| `menu-service/` | 8001 |
| `order-service/` | 8002 |
| `notify-service/` | 8003 |
| `auth-service/` | 8004 |

MongoDB databases on one instance: `campusbite_menu`, `campusbite_orders`, `campusbite_notify`, `campusbite_auth`.

Pick one way to run the app.

## Run with Docker

This starts everything. You do not need the local setup below.

Only the root `.env`.

```powershell
copy .env.example .env
```

macOS / Linux: `cp .env.example .env`

Fill in the values in `.env`, then:

```powershell
docker compose up --build
```

App: http://127.0.0.1:5173

Stop with `docker compose down`.

## Run without Docker

Python 3.11+, Node.js 20+, MongoDB on `127.0.0.1:27017`.

One `.env` in each service folder (`menu-service`, `order-service`, `notify-service`, `auth-service`, `frontend`). 

```powershell
copy menu-service\.env.example menu-service\.env
copy order-service\.env.example order-service\.env
copy notify-service\.env.example notify-service\.env
copy auth-service\.env.example auth-service\.env
copy frontend\.env.example frontend\.env
```

macOS / Linux: use `cp` instead of `copy`. Defaults work for local MongoDB without auth. Keep `JWT_SECRET` the same in every backend `.env`.

Start MongoDB, then one terminal per service.

```powershell
cd menu-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Same for `order-service` (`8002`), `notify-service` (`8003`), and `auth-service` (`8004`). On macOS / Linux: `source .venv/bin/activate`.

```powershell
cd frontend
npm install
npm run dev
```

- App: http://127.0.0.1:5173
- API docs: http://127.0.0.1:8001/docs, [8002](http://127.0.0.1:8002/docs), [8003](http://127.0.0.1:8003/docs), [8004](http://127.0.0.1:8004/docs)
