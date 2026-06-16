from datetime import UTC, datetime


def iso_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
