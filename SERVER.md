# Общий сервер ps.kz (212.116.235.159) — читать перед любыми правками сервера

На одном сервере работают три сайта: **Cosplaygram** (cosplaygram.kz), **ICity** (inclusivecity.uk) и **Bilim Arena** (bilimarena.com).
У них ОДИН вход https — контейнер `cosplaygram-caddy-1` (каталог `/opt/cosplaygram`).

- Его `docker-compose.override.yml` (создан установщиком Bilim Arena) подключает `/opt/edge/Caddyfile`:
  `import /etc/caddy/base.caddy` (= `deploy/Caddyfile` Cosplaygram) и `import /etc/caddy/sites/*.caddy` (= `/opt/edge/sites`).
- Каждый сайт — СВОЙ файл в `/opt/edge/sites` (`inclusivecity.caddy`, `bilim-arena.caddy`). Чужие файлы не удалять и не перезаписывать,
  override и `/opt/edge/Caddyfile` целиком не переписывать (14.11.2026 так на 8 часов пропал ICity).
- После любой правки: `docker exec cosplaygram-caddy-1 caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`,
  затем `caddy reload` и проверка ВСЕХ сайтов:
  `for d in cosplaygram.kz inclusivecity.uk bilimarena.com; do curl -sk -o /dev/null -w "$d %{http_code}\n" --resolve $d:443:127.0.0.1 https://$d/; done`
- ICity сам возвращает свой файл, если https пропал (`/opt/icity/selfheal.js` → `tools/vps/caddy-fix.sh`), а GitHub Actions ICity (`keepalive`) раз в 3 часа проверяет все три сайта.
