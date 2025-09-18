# utils/time_utils.py
from datetime import datetime, timezone

def current_utc_iso():
    """
    Returns the current UTC time in ISO 8601 format with 'Z' suffix.
    Example: "2025-09-18T11:23:45.123456Z"
    """
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
