#!/usr/bin/env bash
# Runs on the VPS as `deploy` (docker group, no sudo). The deploy workflow
# feeds it over ssh:  ssh vps 'bash -s -- <action> <service> <image>' < this
#
#   deploy   <service> <image>  back up the DB, point <service> at <image>
#                               in compose.yaml (copy kept as compose.yaml.bak),
#                               `docker compose up -d --wait`; on failure
#                               restore compose.yaml.bak and bring it back up.
#                               Prints PREVIOUS_IMAGE=<image it replaced>.
#   rollback <service> <image>  point <service> back at <image> and bring it up
#                               (used when the public checks fail afterwards).
#
# portfolio-app and portfolio-backend-go keep identical copies of this file:
# both services live in the one compose.yaml below.
set -euo pipefail

STACK_DIR=/opt/apps/portfolio/production
BACKUP_DIR="$HOME/backups"
KEEP_BACKUPS=10   # newest pre-*.sql.gz dumps kept in $BACKUP_DIR
KEEP_IMAGES=3     # newest local images kept per repository
WAIT_TIMEOUT=180  # seconds for the container healthcheck to pass

action=${1:?action}
service=${2:?service}
image=${3:?image}

case "$service" in
  backend)  repo=ghcr.io/ninjashadowboy/portfolio-backend-go ;;
  frontend) repo=ghcr.io/ninjashadowboy/portfolio-app ;;
  *) echo "unknown service: $service" >&2; exit 2 ;;
esac
# The image goes into a sed expression, so accept only the expected shape.
if [[ "$image" != "$repo:"* || ! "${image#"$repo:"}" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "refusing image '$image' for $service" >&2
  exit 2
fi

cd "$STACK_DIR"

# GitHub concurrency groups are per repository, and both repos edit this
# compose.yaml, so serialise on the box as well.
exec 9>.deploy.lock
flock -w 900 9 || { echo "another deploy still holds $STACK_DIR/.deploy.lock" >&2; exit 1; }

# The `image:` line inside the `  <service>:` block of compose.yaml.
service_image() {
  sed -n "/^  $service:\$/,/^  [a-z]/s/^    image: *//p" compose.yaml | head -n 1
}

set_image() {
  sed -i "/^  $service:\$/,/^  [a-z]/s|^    image: .*|    image: $1|" compose.yaml
  if [[ "$(service_image)" != "$1" ]]; then
    echo "could not set $service image to $1 in compose.yaml" >&2
    return 1
  fi
}

up() {
  docker compose up -d --wait --wait-timeout "$WAIT_TIMEOUT" "$service"
}

case "$action" in
  deploy)
    docker image inspect "$image" >/dev/null
    previous=$(service_image)
    [[ -n "$previous" ]] || { echo "no image line for $service in compose.yaml" >&2; exit 1; }
    echo "PREVIOUS_IMAGE=$previous"

    mkdir -p "$BACKUP_DIR"
    dump="$BACKUP_DIR/pre-$service-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
    docker exec infra-postgres sh -c "pg_dumpall -U postgres" | gzip > "$dump.part"
    mv "$dump.part" "$dump"
    echo "backup: $dump ($(du -h "$dump" | cut -f1))"
    # shellcheck disable=SC2012 # names are ours: pre-<service>-<timestamp>.sql.gz
    ls -1t "$BACKUP_DIR"/pre-*.sql.gz | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f --

    cp -p compose.yaml compose.yaml.bak
    if ! { set_image "$image" && up; }; then
      echo "::error::$service did not come up healthy on $image; restoring compose.yaml.bak" >&2
      docker compose logs --tail 50 "$service" >&2 || true
      cp -p compose.yaml.bak compose.yaml
      up || echo "::error::$service is also unhealthy on $previous" >&2
      exit 1
    fi

    # Old images of this repository add up (the frontend is ~350 MB each).
    # Keep the newest few, and never the one just replaced: it is the
    # rollback target if the public checks fail.
    # `docker images` does not promise an order, so sort by creation time.
    docker images --format '{{.CreatedAt}}|{{.Repository}}:{{.Tag}}' "$repo" \
      | sort -r | cut -d '|' -f 2 \
      | tail -n +$((KEEP_IMAGES + 1)) \
      | while read -r old; do
          [[ "$old" == "$image" || "$old" == "$previous" ]] && continue
          if docker rmi "$old" >/dev/null 2>&1; then echo "removed image $old"; fi
        done
    ;;

  rollback)
    docker image inspect "$image" >/dev/null
    echo "rolling $service back to $image"
    set_image "$image"
    up
    ;;

  *)
    echo "unknown action: $action" >&2
    exit 2
    ;;
esac

docker compose ps "$service"
