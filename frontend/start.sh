#!/bin/sh
set -eu

PORT="${PORT:-80}"
MENU_SERVICE_URL="${MENU_SERVICE_URL:-http://menu-service:8001}"
ORDER_SERVICE_URL="${ORDER_SERVICE_URL:-http://order-service:8002}"
NOTIFY_SERVICE_URL="${NOTIFY_SERVICE_URL:-http://notify-service:8003}"
AUTH_SERVICE_URL="${AUTH_SERVICE_URL:-http://auth-service:8004}"

normalize_url() {
  value="$1"
  value="${value%/}"
  case "$value" in
    http://*|https://*) echo "$value" ;;
    *) echo "https://$value" ;;
  esac
}

host_from_url() {
  echo "$1" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/.*$||'
}

MENU_SERVICE_URL="$(normalize_url "$MENU_SERVICE_URL")"
ORDER_SERVICE_URL="$(normalize_url "$ORDER_SERVICE_URL")"
NOTIFY_SERVICE_URL="$(normalize_url "$NOTIFY_SERVICE_URL")"
AUTH_SERVICE_URL="$(normalize_url "$AUTH_SERVICE_URL")"

sed \
  -e "s|__PORT__|${PORT}|g" \
  -e "s|__MENU_SERVICE_URL__|${MENU_SERVICE_URL}|g" \
  -e "s|__ORDER_SERVICE_URL__|${ORDER_SERVICE_URL}|g" \
  -e "s|__NOTIFY_SERVICE_URL__|${NOTIFY_SERVICE_URL}|g" \
  -e "s|__AUTH_SERVICE_URL__|${AUTH_SERVICE_URL}|g" \
  -e "s|__MENU_HOST__|$(host_from_url "$MENU_SERVICE_URL")|g" \
  -e "s|__ORDER_HOST__|$(host_from_url "$ORDER_SERVICE_URL")|g" \
  -e "s|__NOTIFY_HOST__|$(host_from_url "$NOTIFY_SERVICE_URL")|g" \
  -e "s|__AUTH_HOST__|$(host_from_url "$AUTH_SERVICE_URL")|g" \
  /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
