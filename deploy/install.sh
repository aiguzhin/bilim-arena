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
cat > "$EDGE/README.txt" <<'RD'
Общий вход (https) для ВСЕХ сайтов этого сервера: Cosplaygram, ICity (inclusivecity.uk), Bilim Arena.
Caddy — контейнер cosplaygram-caddy-1 (/opt/cosplaygram), его override подключает этот каталог.
Каждый сайт — СВОЙ файл в sites/*.caddy. Чужие файлы не удалять и не перезаписывать.
После правки: docker exec cosplaygram-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
              docker exec cosplaygram-caddy-1 caddy reload   --config /etc/caddy/Caddyfile --adapter caddyfile
Проверить все сайты: for d in cosplaygram.kz inclusivecity.uk bilimarena.com; do curl -sk -o /dev/null -w "$d %{http_code}\n" --resolve $d:443:127.0.0.1 https://$d/; done
RD
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
# На этом же Caddy живут и другие сайты (ICity — inclusivecity.uk). Раньше ICity подключался своим override,
# и перезапись override ниже его выключала (14.11.2026). Переносим такие сайты в /opt/edge/sites и бережём старый override.
OVR_OLD=$(mktemp); cp -a /opt/cosplaygram/docker-compose.override.yml "$OVR_OLD" 2>/dev/null || : > "$OVR_OLD"
if [ -f /opt/cosplaygram/deploy/Caddyfile.icity ] && ! grep -rqs "inclusivecity.uk" "$EDGE/sites"; then
  grep -v "^import " /opt/cosplaygram/deploy/Caddyfile.icity > "$EDGE/sites/inclusivecity.caddy"
  chmod 644 "$EDGE/sites/inclusivecity.caddy"; echo "ICity перенесён в $EDGE/sites/inclusivecity.caddy"
fi
restore_ovr(){ if [ -s "$OVR_OLD" ]; then cp -a "$OVR_OLD" /opt/cosplaygram/docker-compose.override.yml; else rm -f /opt/cosplaygram/docker-compose.override.yml; fi; }
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
  restore_ovr
  cat /tmp/caddy-validate.log | tail -5
  die "Настройка https не прошла проверку — Cosplaygram не тронут"
fi
docker compose up -d caddy
sleep 3
docker compose ps caddy | grep -qi "up" || { restore_ovr; docker compose up -d caddy; die "Caddy не поднялся — вернул как было"; }
echo "Https настроен для $DOMAIN и www.$DOMAIN"
# Проверяем, что остальные сайты сервера тоже отвечают по https
for d in $( { grep -hoE "^[a-z0-9.-]+\.[a-z]{2,}" "$EDGE"/sites/*.caddy 2>/dev/null; echo "$CDOM" | cut -d, -f1 | tr -d " "; } | grep . | sort -u); do
  curl -sk --max-time 10 -o /dev/null --resolve "$d:443:127.0.0.1" "https://$d/" && echo "  https://$d — отвечает" || echo "  ВНИМАНИЕ: https://$d не отвечает"
done

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
