import logging

logger = logging.getLogger(__name__)


def send_sms(phone: str, text: str) -> None:
    # shortcut: logs instead of sending, swap in the SMS provider's HTTP call
    logger.warning("SMS to %s: %s", phone, text)
