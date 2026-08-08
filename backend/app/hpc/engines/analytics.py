"""Post-reduce analytics: top-N lists from associative histograms."""

from __future__ import annotations

from typing import Any


def top_n(counter: dict[str, int] | None, n: int = 10) -> list[dict[str, Any]]:
    items = sorted((counter or {}).items(), key=lambda kv: (-int(kv[1]), str(kv[0])))
    return [{"key": key, "count": int(count)} for key, count in items[:n]]


def attach_top_n(partial: dict[str, Any], *, n: int = 10) -> dict[str, Any]:
    out = dict(partial)
    out["top_endpoints"] = top_n(partial.get("path_counts"), n)
    out["top_ips"] = top_n(partial.get("ip_counts"), n)
    out["top_services"] = top_n(partial.get("service_counts"), n)
    out["top_status_codes"] = top_n(partial.get("status_counts"), n)
    return out
