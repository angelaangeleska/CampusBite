# Kubernetes

Namespace: `campusbite`. Pods pull images from Docker Hub (`angelaangeleska/campusbite-*`, tags `latest` and `git-<sha>`), published by GitHub Actions on push to `main`. Image names are set in `kustomization.yaml`. `imagePullPolicy: Always`.

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
| Deployment | `menu-service`, `order-service`, `notify-service`, `auth-service`, `frontend` |
| Service | ClusterIP per app; headless `mongo` |
| StatefulSet | `mongo` (PVC 2Gi) |
| Ingress | `campusbite` — host `campusbite.local` |

Ingress paths: `/api/menu`, `/api/orders`, `/api/notifications`, `/api/auth`, `/`.

## Apply

```bash
kubectl apply -k k8s
kubectl -n campusbite get all,ingress,pvc,configmap,secret
```

Hosts entry: `127.0.0.1 campusbite.local`  
URL: http://campusbite.local
