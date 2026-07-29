# Angular 22 SSR image. Two stages: the builder carries the full toolchain and
# pnpm store, the runtime carries only Node + the built server bundle.
#
# BUILD_CONFIG selects the Angular configuration, which is what swaps
# src/environments/environment.ts for the per-environment file via
# fileReplacements. It is a build arg (not a runtime env) because apiBaseUrl is
# compiled into the browser bundle - a "runtime" override would not reach it.
ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS builder

WORKDIR /src

# package.json has no `packageManager` field, so the pnpm major is pinned here
# to match .github/workflows (pnpm/action-setup version 11). Bump both together.
ARG PNPM_VERSION=11
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate

# Dependency layer first: it only busts when the manifests change, so source
# edits reuse the cached install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm config set store-dir /pnpm-store && \
    pnpm install --frozen-lockfile

COPY . .

ARG BUILD_CONFIG=production
# content:build generates src/generated/** (articles, public assets) that the
# Angular build lists in "assets" - it must run first or those assets are missing.
RUN pnpm content:build && pnpm exec ng build --configuration "${BUILD_CONFIG}"

FROM node:${NODE_VERSION} AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000

# The SSR bundle is self-contained (Angular bundles its server deps), so no
# second install here - that is what keeps this image small.
COPY --from=builder /src/dist/portfolio-app ./dist/portfolio-app

# node:alpine already ships an unprivileged `node` user.
USER node
EXPOSE 4000

# Busybox wget is present in alpine; compose's healthcheck uses it rather than
# adding curl just for that.
CMD ["node", "dist/portfolio-app/server/server.mjs"]
