# Kubernetes

Namespace: `campusbite`. Workloads pull images published by CI to Docker Hub; the cluster does not build them.

## CI → registry → cluster

Workloads use the images published by GitHub Actions (see the root README). `kustomization.yaml` maps them as:

| Workload | Image |
|----------|-------|
| menu-service | `angelaangeleska/campusbite-menu` |
| order-service | `angelaangeleska/campusbite-order` |
| notify-service | `angelaangeleska/campusbite-notify` |
| auth-service | `angelaangeleska/campusbite-auth` |
| frontend | `angelaangeleska/campusbite-frontend` |

Tags: `latest` and `git-<sha>`. Deployments set `imagePullPolicy: Always`.

## ConfigMap vs Secret

| Object | Keys | Source |
|--------|------|--------|
| ConfigMap `campusbite-config` | `CORS_ORIGINS`, `MENU_SERVICE_URL`, `NOTIFY_SERVICE_URL` | [`configmap.yaml`](configmap.yaml) |
| ConfigMap `mongo-cafeteria-config` | `mongod.conf`, init collections script | [`mongo-configmap.yaml`](mongo-configmap.yaml) |
| Secret `campusbite-secrets` | `jwt-secret`, `mongo-root-username`, `mongo-root-password` | generated from `secrets.env` |

`secrets.env` is gitignored. Copy the example, then apply:

```powershell
copy k8s\secrets.env.example k8s\secrets.env
```

Application pods read JWT from the Secret. Mongo URIs are composed at runtime (`mongodb://$(MONGO_ROOT_USERNAME):$(MONGO_ROOT_PASSWORD)@mongo-0.mongo:27017/<db>?authSource=admin`). The StatefulSet injects `MONGO_INITDB_ROOT_*` from the same Secret.

## Resources

| Kind | Name |
|------|------|
| Namespace | `campusbite` |
| Deployment | `menu-service`, `order-service`, `notify-service`, `auth-service`, `frontend` |
| Service (ClusterIP) | matching each app |
| Service (headless) | `mongo` |
| StatefulSet + PVC | `mongo` (2Gi) |
| Ingress | `campusbite` — host `campusbite.local` |

Ingress (`ingressClassName: nginx`) routes `/api/menu`, `/api/orders`, `/api/notifications`, `/api/auth` to the backends and `/` to the frontend.

## Deploy

Requires a cluster with the nginx Ingress controller and images already on Docker Hub.

```powershell
kubectl apply -k k8s
kubectl -n campusbite rollout status statefulset/mongo
kubectl -n campusbite get all,ingress,pvc,configmap,secret
```

Map `campusbite.local` to the Ingress address (`kubectl -n campusbite get ingress`). On minikube, use `minikube ip` / `minikube tunnel` as required by that setup.

http://campusbite.local
