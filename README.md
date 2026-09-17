# CampusBite

Campus cafeteria ordering. Guests order with a name. Registered students can track the current order and history after pickup. Staff manage today’s menu and the kitchen queue (`pending` → accept/deny → `preparing` → `ready` → `picked_up`).

| Service | Port |
|---------|------|
| `frontend/` | 5173 |
| `menu-service/` | 8001 |
| `order-service/` | 8002 |
| `notify-service/` | 8003 |
| `auth-service/` | 8004 |

MongoDB (one instance, four databases): `campusbite_menu`, `campusbite_orders`, `campusbite_notify`, `campusbite_auth`.

## CI/CD

Workflow: [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)

**CI** — on push to `main`, the pipeline validates Docker Compose and Kubernetes manifests, runs backend pytest and frontend Vitest + build, then publishes five images in parallel to Docker Hub (`angelaangeleska/campusbite-*`, tags `latest` and `git-<sha>`). Images are not pushed if tests fail. Registry login uses `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`. Application credentials are not used in this job.

**CD** — after a successful publish, the self-hosted runner pins `kustomization.yaml` to `git-<sha>` (the same tag just pushed), then runs `kubectl apply -k k8s` against the local k3d cluster (`mycluster`), namespace `campusbite`. That changes the Deployment image field, so Kubernetes rolls out the new pods. Runtime credentials come from Actions secrets `JWT_SECRET`, `MONGO_ROOT_USERNAME`, and `MONGO_ROOT_PASSWORD`. The deploy job runs only when the Actions variable `CD_ENABLED` is `true`.

Cluster URL: http://campusbite.local

Kubernetes layout: [`k8s/README.md`](k8s/README.md).

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

App: http://127.0.0.1:5173

Values come from `.env` (gitignored). Template: `.env.example`.

## Local (without Docker)

Python 3.11+, Node.js 20+, MongoDB on `127.0.0.1:27017`. Copy each service `.env.example` to `.env`. Use the same `JWT_SECRET` in every backend.

```bash
cd menu-service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Repeat for `order-service` (8002), `notify-service` (8003), `auth-service` (8004). Frontend: `cd frontend && npm install && npm run dev`.

API docs: http://127.0.0.1:8001/docs, [8002](http://127.0.0.1:8002/docs), [8003](http://127.0.0.1:8003/docs), [8004](http://127.0.0.1:8004/docs).

