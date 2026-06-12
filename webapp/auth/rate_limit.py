"""Rate-Limiting für Auth-Endpoints (Phase W).

Schuetzt /login und /register vor Brute-Force + Account-Enumeration.

Strategie:
- Per-IP-Limiter (slowapi-Default via remote_address)
- 5 Requests/Minute auf /login + /register
- 429-Response mit Retry-After-Header bei Ueberschreitung

Limitierung der Limitierung:
- In-Memory-Store: überlebt keinen Server-Restart, nicht multi-process-fest
  (1 Uvicorn-Worker auf Coolify, daher OK)
- IP-basiert: `get_remote_address` liest NUR `request.client.host` und wertet
  X-Forwarded-For NICHT selbst aus (QA-Befund 2026-06-12 — die frühere
  Behauptung hier war falsch). Hinter Traefik+nginx wäre der Key sonst für
  ALLE Besucher die Proxy-IP. Fix: uvicorn läuft mit `--proxy-headers
  --forwarded-allow-ips=<private Ranges>` (webapp/Dockerfile) — die
  ProxyHeadersMiddleware ersetzt request.client durch die echte Client-IP
  aus der XFF-Kette (von rechts gelesen, gespoofte Einträge ignoriert).
- Später (~Multi-Worker): Redis-Backend via storage_uri
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Globaler Limiter — Single-Source-of-Truth für alle Auth-Endpoints.
# In main.py wird er als app.state.limiter gesetzt + Exception-Handler registriert.
limiter = Limiter(key_func=get_remote_address)

# Limits — bewusst konservativ. Bei Friends-Phase noch entspannbar wenn nötig.
LOGIN_LIMIT = "5/minute"
REGISTER_LIMIT = "5/minute"
REFRESH_LIMIT = "20/minute"  # legitime Clients refreshen alle ~14min, 20/min = viel Spielraum
