# Deployment

The SSR server deploys as a Docker image. `.github/workflows/deploy.yml`
builds `ghcr.io/ninjashadowboy/portfolio-app:sha-<commit>` from the
`Dockerfile` at the repo root and then runs the Ansible deploy playbook from
the infra repo (the `deploy/` directory of the portfolio monorepo, published
as its own repository and named by the `INFRA_REPO` Actions variable).

Pushing to `main` deploys production; `staging` deploys the staging stack.

What lives where:

| Concern | Where |
| --- | --- |
| Image build (`bun run build`, Node 24 runtime, `HOST=0.0.0.0`) | `Dockerfile` |
| OpenTelemetry bootstrap loaded with `node --import` | `otel/instrumentation.mjs` |
| Server setup, nginx, TLS, compose stacks | infra repo, `roles/` |
| Runtime environment (`PORT`, `DEPLOY_ENV`, OTLP endpoint) | infra repo, `roles/portfolio/templates/frontend.env.j2` |
| Rollback | re-run the deploy playbook with an older `frontend_image_tag` |

There are no secrets in this app: `apiBaseUrl` is compiled into the bundle at
build time from `src/environments/environment.prod.ts`.

Staging still shares the production API: there is no
`environment.staging.ts` and no `staging` Angular configuration, so the
staging image is built with the production configuration. To split them, add
the environment file, a `staging` configuration with `fileReplacements` in
`angular.json`, and pass `--configuration staging` in the Dockerfile via a
build arg on the staging branch.

Local image build:

```bash
docker build -t portfolio-app:local .
docker run --rm -p 4000:4000 portfolio-app:local
```
