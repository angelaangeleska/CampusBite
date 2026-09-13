import logging

import httpx

from app.config import get_settings
from app.models import OrderStatus, notification_message

logger = logging.getLogger(__name__)


async def fetch_menu_item(item_id: str) -> dict | None:
    settings = get_settings()
    url = f"{settings.menu_service_url.rstrip('/')}/api/menu/items/{item_id}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            if response.status_code in {400, 404}:
                return None
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        logger.error("menu-service call failed: %s", exc)
        raise


async def publish_notification(
    *,
    order_id: str,
    status: OrderStatus,
    customer_name: str,
    customer_username: str | None = None,
    reason: str | None = None,
) -> None:
    """Best-effort: order flow continues even if notify-service is down."""
    settings = get_settings()
    payload = {
        "type": "order.placed" if status == OrderStatus.pending else "order.status_changed",
        "order_id": order_id,
        "customer_name": customer_name,
        "customer_username": customer_username,
        "message": notification_message(status, customer_name, reason),
    }
    url = f"{settings.notify_service_url.rstrip('/')}/api/notifications"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("notify-service unavailable, continuing: %s", exc)
