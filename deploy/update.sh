#!/usr/bin/env bash
# Подтягивает новую версию Bilim Arena с GitHub и перезапускает сайт, только если что-то изменилось.
set -euo pipefail
cd /opt/bilim-arena
git fetch -q origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  git reset -q --hard origin/main
  chmod +x deploy/*.sh
  export GIT_COMMIT=$(git rev-parse HEAD)
  docker compose up -d --build
  docker image prune -f >/dev/null
  echo "$(date '+%F %T') обновлено до $(git rev-parse --short HEAD)"
fi
