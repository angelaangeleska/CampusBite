# Kubernetes

Namespace: `campusbite`. Pods pull images from Docker Hub (`angelaangeleska/campusbite-*`). Manual apply uses `latest`; the CD job rewrites `kustomization.yaml` to `git-<sha>` so each push rolls out that exact build. `imagePullPolicy: Always`.

## Cluster

```bash
k3d cluster create mycluster -p "80:80@loadbalancer" -p "443:443@loadbalancer"
```

k3s provides Traefik (`ingressClassName: traefik`).

## ConfigMap and Secret

| Object | Contents |
|--------|----------|
| ConfigMap `campusbite-config` | `CORS_ORIGINS`, `MENU_SERVICE_URL`, `NOTIFY_SERVICE_URL` |
| ConfigMap `mongo-cafeteria-config` | `mongod.conf`, collection init script |
| Secret `campusbite-secrets` | `jwt-secret`, `mongo-root-username`, `mongo-root-password` |

The Secret is generated from `secrets.env` (gitignored). Template: `secrets.env.example`.

```bash
cp k8s/secrets.env.example k8s/secrets.env
```

Pods take `JWT_SECRET` from the Secret. Mongo connection strings are built at runtime from the same keys (`authSource=admin`). The StatefulSet sets `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` from the Secret.

## Resources

| Kind | Name |
|------|------|
| Deployment | `menu-service`, `order-service`, `notify-service`, `auth-service`, `frontend` (2 replicas) |
| Service | ClusterIP per app; headless `mongo` |
| StatefulSet | `mongo` (1 replica, PVC 2Gi) |
| Ingress | `campusbite` — host `campusbite.local` |

Ingress paths: `/api/menu`, `/api/orders`, `/api/notifications`, `/api/auth`, `/`.

## Apply

```bash
kubectl apply -k k8s
kubectl -n campusbite get all,ingress,pvc,configmap,secret
```

Target: k3d cluster `mycluster` on the local machine. Namespace: `campusbite`. Ingress: http://campusbite.local (`127.0.0.1` in the hosts file).

CD (self-hosted runner, `CD_ENABLED=true`) copies secrets, pins images to `git-<sha>`, then `kubectl apply -k k8s`.
