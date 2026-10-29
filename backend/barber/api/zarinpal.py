import json
import urllib.error
import urllib.request

from django.conf import settings


class ZarinpalError(Exception):
    """`code` is None for network/parse failures (safe to retry), else Zarinpal's rejection code."""

    def __init__(self, message: str, code: int | None = None):
        super().__init__(message)
        self.code = code


def _base_url() -> str:
    return "https://sandbox.zarinpal.com" if settings.ZARINPAL_SANDBOX else "https://payment.zarinpal.com"


def _post(path: str, payload: dict) -> dict:
    body = json.dumps({"merchant_id": settings.ZARINPAL_MERCHANT_ID, **payload}).encode()
    req = urllib.request.Request(
        f"{_base_url()}/pg/v4/payment/{path}.json",
        data=body,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as exc:  # Zarinpal answers rejections with 4xx + JSON body
        try:
            data = json.loads(exc.read())
        except ValueError:
            raise ZarinpalError(f"Zarinpal HTTP {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise ZarinpalError(f"Zarinpal unreachable: {exc}") from exc

    # Success: {"data": {"code": 100, ...}, "errors": []}; failure: {"data": [], "errors": {"code": -9, ...}}
    result = data.get("data") if isinstance(data.get("data"), dict) else {}
    if not result:
        errors = data.get("errors") if isinstance(data.get("errors"), dict) else {}
        raise ZarinpalError(errors.get("message", "Zarinpal rejected the request"), errors.get("code"))
    return result


def request_payment(*, amount_rials: int, description: str, callback_url: str, mobile: str, email: str) -> str:
    """Returns the payment Authority."""
    metadata = {"mobile": mobile, **({"email": email} if email else {})}
    result = _post(
        "request",
        {"amount": amount_rials, "description": description, "callback_url": callback_url, "metadata": metadata},
    )
    if result.get("code") != 100 or not result.get("authority"):
        raise ZarinpalError(result.get("message", "Payment request failed"), result.get("code"))
    return result["authority"]


def verify_payment(*, authority: str, amount_rials: int) -> str:
    """Returns the ref_id. 101 means 'already verified', which is still a paid order."""
    result = _post("verify", {"authority": authority, "amount": amount_rials})
    if result.get("code") not in (100, 101):
        raise ZarinpalError(result.get("message", "Payment not verified"), result.get("code"))
    return str(result.get("ref_id", ""))


def start_pay_url(authority: str) -> str:
    return f"{_base_url()}/pg/StartPay/{authority}"
