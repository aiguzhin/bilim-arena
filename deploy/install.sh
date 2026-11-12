#!/usr/bin/env bash
# Установка Bilim Arena на сервер, где уже работает Cosplaygram (ps.kz), одной командой под root:
#   curl -sL bilim-arena-a77u.onrender.com/i | bash -s КОД
# КОД — одноразовый ключ: по нему сервер забирает настройки (адрес базы и т. п.) со старого сайта на Render.
set -euo pipefail
CODE="${1:-}"
DIR=/opt/bilim-arena
EDGE=/opt/edge
OLD=https://bilim-arena-a77u.onrender.com
DOMAIN=bilimarena.com
say() { printf '\n\033[1;33m== %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m!! %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "Запустите под root"
command -v docker >/dev/null || die "Docker не найден — сначала должен быть установлен Cosplaygram"
[ -f /opt/cosplaygram/docker-compose.yml ] || die "Не найден /opt/cosplaygram"

say "1/6 Скачиваю Bilim Arena"
command -v git >/dev/null || (apt-get update -qq && apt-get install -y -qq git)
if [ -d "$DIR/.git" ]; then git -C "$DIR" fetch -q origin main && git -C "$DIR" reset -q --hard origin/main
else git clone -q https://github.com/aiguzhin/bilim-arena.git "$DIR"; fi
cd "$DIR"

say "2/6 Настройки"
if [ ! -s .env ]; then
  [ -n "$CODE" ] || die "Нужен код: curl -sL bilim-arena-a77u.onrender.com/i | bash -s КОД"
  umask 077
  curl -fsS --max-time 30 -H "x-handoff: $CODE" "$OLD/api/handoff" -o .env.tmp || die "Код не подошёл или старый сайт спит — подождите минуту и повторите"
  grep -q '^DATABASE_URL=postgres' .env.tmp || { rm -f .env.tmp; die "Не получил адрес базы"; }
  mv .env.tmp .env
  echo "Настройки получены"
else
  echo "Файл .env уже есть — оставляю как есть"
fi

say "3/6 Собираю и запускаю сайт"
docker network inspect edge >/dev/null 2>&1 || docker network create edge >/dev/null
export GIT_COMMIT=$(git rev-parse HEAD)
docker compose up -d --build
for i in $(seq 1 40); do
  docker exec bilim-arena wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1 && break
  sleep 3; [ "$i" = 40 ] && { docker logs --tail 40 bilim-arena; die "Сайт не запустился"; }
done
echo "Сайт работает внутри сервера"

say "4/6 Подключаю домен $DOMAIN к общему https (Caddy Cosplaygram)"
mkdir -p "$EDGE/sites"
cat > "$EDGE/Caddyfile" <<'CF'
# Общий вход для всех сайтов сервера. Cosplaygram — из его репозитория, остальные — из /opt/edge/sites.
import /etc/caddy/base.caddy
import /etc/caddy/sites/*.caddy
CF
cat > "$EDGE/sites/bilim-arena.caddy" <<CF
$DOMAIN, www.$DOMAIN {
	encode gzip
	reverse_proxy bilim-arena:3000
}
CF
cat > /opt/cosplaygram/docker-compose.override.yml <<'OV'
# Создан установщиком Bilim Arena: Caddy Cosplaygram обслуживает ещё и сайты из /opt/edge/sites.
services:
  caddy:
    volumes:
      - /opt/edge/Caddyfile:/etc/caddy/Caddyfile:ro
      - ./deploy/Caddyfile:/etc/caddy/base.caddy:ro
      - /opt/edge/sites:/etc/caddy/sites:ro
    networks: [default, edge]
networks:
  edge:
    external: true
    name: edge
OV
cd /opt/cosplaygram
CDOM=$(grep '^DOMAIN=' .env | cut -d= -f2-)
if ! docker run --rm -e DOMAIN="$CDOM" -v "$EDGE/Caddyfile:/etc/caddy/Caddyfile:ro" -v /opt/cosplaygram/deploy/Caddyfile:/etc/caddy/base.caddy:ro -v "$EDGE/sites:/etc/caddy/sites:ro" caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/caddy-validate.log 2>&1; then
  rm -f /opt/cosplaygram/docker-compose.override.yml
  cat /tmp/caddy-validate.log | tail -5
  die "Настройка https не прошла проверку — Cosplaygram не тронут"
fi
docker compose up -d caddy
sleep 3
docker compose ps caddy | grep -qi "up" || { rm -f docker-compose.override.yml; docker compose up -d caddy; die "Caddy не поднялся — вернул как было"; }
echo "Https настроен для $DOMAIN и www.$DOMAIN"

say "5/6 Автообновление с GitHub"
chmod +x "$DIR"/deploy/*.sh
cat > /etc/cron.d/bilim-arena <<'CRON'
SHELL=/bin/bash
*/5 * * * * root /opt/bilim-arena/deploy/update.sh >> /var/log/bilim-arena-update.log 2>&1
CRON

say "6/6 Готово!"
IP=$(curl -fsS --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
echo "   IP сервера: $IP"
echo "   Сайт: https://$DOMAIN (заработает, когда A-записи @ и www домена укажут на $IP)"
