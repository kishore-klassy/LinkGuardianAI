import logging
import time
import sys
from datetime import datetime


def setup_logging():
    formatter = logging.Formatter(
        fmt="\n[%(asctime)s] %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    # Clear existing handlers to avoid duplicate logs
    root.handlers.clear()
    root.addHandler(handler)

    return root


class RequestLogger:
    def __init__(self):
        self.logger = logging.getLogger("expirelinkx.api")

    def log_request(self, method: str, path: str, body: dict = None):
        self.logger.info(
            "→ %s %s%s",
            method,
            path,
            f" | body: {str(body)[:300]}" if body else "",
        )

    def log_response(self, method: str, path: str, status: int, duration_ms: float, summary: str = ""):
        level = logging.WARNING if status >= 400 else logging.INFO
        self.logger.log(
            level,
            "← %s %s → %d | %.0fms%s",
            method,
            path,
            status,
            duration_ms,
            f" | {summary}" if summary else "",
        )

    def log_error(self, method: str, path: str, error: str):
        self.logger.error("✗ %s %s | ERROR: %s", method, path, error)

    def log_scan_start(self, url_count: int, page: str):
        self.logger.info(
            "▸ SCAN START: %d links from %s", url_count, page
        )

    def log_scan_result(self, total: int, broken: int, ok: int, redirects: int, loss: int):
        self.logger.info(
            "▸ SCAN DONE: %d total | %d broken | %d ok | %d redirects | ₹%d/mo loss",
            total, broken, ok, redirects, loss,
        )

    def log_youtube_start(self, channel: str):
        self.logger.info("▸ YOUTUBE SCAN START: channel=%s", channel)

    def log_youtube_result(self, videos: int, links: int, broken: int, loss: int):
        self.logger.info(
            "▸ YOUTUBE SCAN DONE: %d videos | %d links | %d broken | ₹%d/mo loss",
            videos, links, broken, loss,
        )

    def log_link_check(self, url: str, status: str, code: int = None, suggestion: str = None):
        self.logger.debug(
            "  • %s [%s%s]%s",
            url[:80],
            status,
            f" {code}" if code else "",
            f" → {suggestion[:60]}" if suggestion else "",
        )


logger = RequestLogger()
