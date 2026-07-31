# Frontend deployment & operations

Deploys ship a prebuilt SSR bundle. `.github/workflows/deploy.yml` runs
`pnpm build`, scp's `dist/portfolio-app` into a fresh release directory on
the VPS, then repoints the `current` symlink and restarts the systemd
`--user` service. Pushing to `main` deploys production; `staging` deploys the
staging instance.

## Layout on the VPS

```
/srv/apps/portfolio/frontend/
├── production/
│   ├── releases/
│   │   ├── <sha>/
│   │   │   └── dist/portfolio-app/   # `ng build` output: browser/ + server/
│   │   └── ...                       # last 5 kept, older pruned each deploy
│   ├── current -> releases/<sha>     # symlink, repointed each deploy
│   └── .env                          # PORT, NODE_ENV, DEPLOY_ENV
└── staging/
    ├── releases/...
    ├── current
    └── .env
```

`APP_PATH` must match the GitHub Actions **variable** `APP_PATH`. This sits
alongside `/srv/apps/portfolio/backend` - both apps share the box and the
same deploy user.

There are **no secrets here.** `apiBaseUrl` is compiled into the browser
bundle at build time, so the frontend has nothing to keep private at
runtime; `.env` holds only `PORT`, `NODE_ENV` and `DEPLOY_ENV`.

## The service

The app runs as a **systemd `--user` service** under the deploy user - the
same user (and linger-enabled systemd session) the backend's
`portfolio-backend@` units run under:

| Unit | Runs | Port |
| --- | --- | --- |
| `portfolio-frontend@production` | `current/dist/portfolio-app/server/server.mjs` | 4000 |
| `portfolio-frontend@staging` | same, staging env dir | 4001 |

The unit is templated at `deploy/portfolio-frontend@.service`, versioned with
the code. `bootstrap.sh` renders it (substituting the real `APP_PATH`) into
`~/.config/systemd/user/portfolio-frontend@.service` - a one-time install,
not repeated by CI on every deploy. If you change the template, re-run
`bootstrap.sh` (or redo the substitution by hand) and `systemctl --user
daemon-reload`.

The SSR server binds to `127.0.0.1:$PORT`; host nginx terminates TLS and
proxies to it. It is never reachable from the internet directly.

Unlike the Go backend, this needs a **Node runtime installed on the box** -
`bootstrap.sh` installs it via NodeSource. The SSR bundle itself is
self-contained (Angular bundles its server deps into `server.mjs`), so
nothing beyond the `node` binary is needed at runtime - no `node_modules`
ships with the release.

## One-time setup

```bash
# On the VPS, AS THE DEPLOY USER (the one CI's SSH key logs in as - reuse the
# backend's if both apps share a user):
git clone <repo> && cd portfolio-app/deploy
APP_PATH=/srv/apps/portfolio/frontend ./bootstrap.sh
```

This installs Node (if missing or too old), creates the per-environment
directories, and installs the systemd user unit. `loginctl enable-linger` is
harmless to re-run if the backend's `bootstrap.sh` already enabled it for
this user.

Then, in the repo settings:

- **Variables:** `APP_PATH` = `/srv/apps/portfolio/frontend`
- **Secrets:** `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (can reuse the backend's
  if both deploy as the same user)
- **Environments** `production` and `staging` (no secrets needed in either)

### nginx

Proxy the public domain to `127.0.0.1:4000`, then `certbot --nginx`. Route
`/portfolio/v1/*` to the backend's port instead, so the browser reaches the
API on the same origin.

## Staging currently shares the production API

There is no `src/environments/environment.staging.ts` and no `staging`
configuration in `angular.json`, so the staging build uses the `production`
Angular configuration and its bundle points at the production API.

To split them properly:

1. Add `src/environments/environment.staging.ts` with the staging `apiBaseUrl`.
2. Add a `staging` configuration in `angular.json` with a `fileReplacements`
   entry mapping `environment.ts` → `environment.staging.ts`.
3. In `deploy.yml`, change the build step to pass `--configuration staging`
   on the staging branch instead of relying on the default.

Until then, treat staging as a deploy-mechanics rehearsal, not an isolated
environment.

## Logs and status

```bash
journalctl --user -u portfolio-frontend@production -f      # follow
journalctl --user -u portfolio-frontend@production -n 200
systemctl --user status portfolio-frontend@production
curl -I http://127.0.0.1:4000/
```

## Rollback

Releases are kept by SHA under `releases/`, so rolling back is repointing
the `current` symlink:

```bash
cd /srv/apps/portfolio/frontend/production
ls releases                              # find the previous SHA
ln -sfn releases/<previous-sha> current
systemctl --user restart portfolio-frontend@production
```
