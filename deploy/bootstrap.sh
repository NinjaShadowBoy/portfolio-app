#!/usr/bin/env bash
#
# One-time VPS setup for the portfolio frontend. Run once on the server, AS
# THE DEPLOY USER itself - the same user (and the same linger-enabled
# systemd session) the backend's deploy/bootstrap.sh sets up, since both
# apps share the box. Safe to re-run; it is idempotent.
#
#   APP_PATH=/srv/apps/portfolio/frontend ./bootstrap.sh
#
# Deploys ship a prebuilt SSR bundle: CI runs `pnpm build` and scp's
# dist/portfolio-app up. Unlike the Go backend, the SSR server needs a Node
# runtime present on the box to run it - that's the one thing this script
# installs beyond the directory tree and the systemd user unit.
set -euo pipefail

APP_PATH="${APP_PATH:-/srv/apps/portfolio/frontend}"
NODE_MAJOR="${NODE_MAJOR:-24}"
ENVS=(production staging)
UNIT_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portfolio-frontend@.service"
UNIT_DST="$HOME/.config/systemd/user/portfolio-frontend@.service"

echo "APP_PATH=$APP_PATH  USER=$USER  NODE_MAJOR=$NODE_MAJOR"

# 1. Node itself. The SSR bundle is self-contained (Angular bundles its
#    server deps), so nothing beyond the `node` binary is needed at runtime.
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "$NODE_MAJOR" ]; then
  echo "Installing Node ${NODE_MAJOR}.x via NodeSource"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2. Per-environment directories. CI writes a new releases/<sha>/ and .env
#    into these on every deploy, so they only need to exist with the right
#    permissions.
for env in "${ENVS[@]}"; do
  install -d -m 755 "$APP_PATH/$env/releases"
done

# 3. Render the unit template with the real APP_PATH and install it as a
#    user unit. No root needed to install, run, or manage it.
mkdir -p "$(dirname "$UNIT_DST")"
sed "s#__APP_PATH__#$APP_PATH#g" "$UNIT_SRC" > "$UNIT_DST"
systemctl --user daemon-reload

# 4. Let this user's systemd session - and the services running under it -
#    start on boot without an interactive login. Harmless to re-run if the
#    backend's bootstrap.sh already did this for the same user.
sudo loginctl enable-linger "$USER"

cat <<DONE

Bootstrap complete.

  Layout:     $APP_PATH/<env>/{releases/<sha>/,current,.env}   (written by CI)
  Unit:       $UNIT_DST (rendered from deploy/portfolio-frontend@.service)
  Start:      handled by CI on first deploy; by hand:
              systemctl --user start portfolio-frontend@production
  Logs:       journalctl --user -u portfolio-frontend@production -f
  Status:     systemctl --user status portfolio-frontend@production

Still to do (see DEPLOY.md):
  - the repo variable APP_PATH, set to $APP_PATH
  - VPS_HOST/VPS_USER/VPS_SSH_KEY secrets (can reuse the backend's if same user)
  - nginx reverse proxy + certbot in front of the loopback ports
DONE
