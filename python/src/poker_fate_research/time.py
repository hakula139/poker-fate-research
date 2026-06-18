from datetime import UTC, datetime


def iso_format(moment: datetime) -> str:
    """Format an aware datetime as second-precision UTC with a ``Z`` suffix."""
    return moment.replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def iso_now() -> str:
    """Return the current UTC time as second-precision ISO with a ``Z`` suffix."""
    return iso_format(datetime.now(UTC))
