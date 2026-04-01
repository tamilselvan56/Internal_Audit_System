import json
import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("audit_pro")


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        start = time.perf_counter()
        request.state.correlation_id = correlation_id

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000

            auth = request.headers.get("Authorization", "")
            user_hint = "authenticated" if auth.startswith("Bearer ") else "anonymous"

            payload = {
                "event": "http_request",
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query),
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("User-Agent", "")[:120],
                "user": user_hint,
            }

            level = logging.WARNING if response.status_code >= 400 else logging.INFO
            logger.log(level, json.dumps(payload))

            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Duration-Ms"] = str(round(duration_ms, 2))
            return response
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.error(json.dumps({
                "event": "http_error",
                "correlation_id": correlation_id,
                "method": request.method,
                "path": request.url.path,
                "error": str(exc),
                "duration_ms": round(duration_ms, 2),
            }))
            raise


def setup_logging(log_level: str = "INFO"):
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format='{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":%(message)s}',
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
