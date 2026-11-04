# syntax=docker/dockerfile:1.7

# Build stage. Scripts run under bun (package.json), but `ng build` itself
# runs on node via its shebang, so the builder carries both runtimes.
FROM node:24-bookworm-slim AS build
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /src

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .
# production or staging: picks the environment file (API base URL) baked
# into the bundle. The deploy workflow sets it from the branch.
ARG NG_CONFIGURATION=production
RUN bun run build --configuration=${NG_CONFIGURATION}

# The OpenTelemetry bootstrap has its own tiny dependency set; installing it
# here keeps the runtime image free of the Angular toolchain.
FROM oven/bun:1-alpine AS otel
WORKDIR /otel
COPY otel/package.json otel/bun.lock ./
RUN bun install --frozen-lockfile --production

# Runtime stage: the self-contained SSR bundle plus the otel bootstrap.
FROM node:24-alpine
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000
WORKDIR /app

COPY --from=build --chown=node:node /src/dist/portfolio-app ./dist/portfolio-app
COPY --from=otel --chown=node:node /otel/node_modules ./otel/node_modules
COPY --chown=node:node otel/package.json otel/instrumentation.mjs ./otel/

ARG VERSION=dev
ENV APP_VERSION=${VERSION}

USER node
EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["node", "--import", "./otel/instrumentation.mjs", "dist/portfolio-app/server/server.mjs"]
