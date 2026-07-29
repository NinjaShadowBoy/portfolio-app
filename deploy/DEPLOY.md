# Frontend deployment & operations

`.github/workflows/deploy.yml` builds the Angular SSR app into a container image,
pushes it to GHCR, copies `deploy/docker-compose.yml` to the box, and rolls the
stack with `docker compose up -d --wait`. Pushing to `main` deploys production;
`staging` deploys the staging instance.

The build happens **inside the image**, not in a CI step — so there is exactly one
definition of how this app is built and CI cannot produce an artifact the image
would not.

## Layout on the VPS

```
/opt/portfolio-app/
├── production/
│   ├── docker-compose.yml   # copied by CI from deploy/
│   └── .env                 # image tag + host port, written by CI
└── staging/
    └── ...
```

`APP_PATH` must match the GitHub Actions **variable** `APP_PATH`.

There are **no secrets here.** `apiBaseUrl` is compiled into the browser bundle at
image build time, so the frontend has nothing to keep private at runtime; the
`.env` holds only `FRONTEND_IMAGE`, `FRONTEND_PORT` and `DEPLOY_ENV`.

## The container

One service. The SSR server listens on 4000 inside the container; the host-side
port is 4000 for production and 4001 for staging, published on `127.0.0.1` only.
Host nginx terminates TLS and proxies to it.

## One-time setup

```bash
# On the VPS:
sudo install -d -o $USER -g $USER -m 755 /opt/portfolio-app/{production,staging}
```

Docker and the deploy user's `docker` group membership are handled by the backend
repo's `deploy/bootstrap.sh` — both apps share the same box and the same daemon.

Then, in the repo settings:

- **Variables:** `APP_PATH` = `/opt/portfolio-app`
- **Secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- **Environments** `production` and `staging` (no secrets needed in either)

### nginx

Proxy the public domain to `127.0.0.1:4000`, then `certbot --nginx`. Route
`/portfolio/v1/*` to the backend's port instead, so the browser reaches the API on
the same origin.

## Staging currently shares the production API

There is no `src/environments/environment.staging.ts` and no `staging`
configuration in `angular.json`, so the staging image is built with the
`production` configuration and its bundle points at the production API.

To split them properly:

1. Add `src/environments/environment.staging.ts` with the staging `apiBaseUrl`.
2. Add a `staging` configuration in `angular.json` with a `fileReplacements`
   entry mapping `environment.ts` → `environment.staging.ts`.
3. In `deploy.yml`, change the hardcoded `BUILD_CONFIG=production` build arg to
   the branch-derived environment name.

Until then, treat staging as a deploy-mechanics rehearsal, not an isolated
environment.

## Logs and status

```bash
cd /opt/portfolio-app/production

docker compose logs -f frontend      # follow
docker compose logs --tail=200 frontend
docker compose ps                    # includes the container's health state
curl -I http://127.0.0.1:4000/
```

Output is capped at 3×10MB by the compose `logging` block.

## Rollback

Images are tagged with the commit SHA:

```bash
cd /opt/portfolio-app/production
sudo sed -i "s|^FRONTEND_IMAGE=.*|FRONTEND_IMAGE=ghcr.io/<owner>/portfolio-app:<previous-sha>|" .env
docker compose up -d --wait
```
