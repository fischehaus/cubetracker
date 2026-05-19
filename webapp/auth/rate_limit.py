"""Rate-Limiting für Auth-Endpoints (Phase W).

Schuetzt /login und /register vor Brute-Force + Account-Enumeration.

Strategie:
- Per-IP-Limiter (slowapi-Default via remote_address)
- 5 Requests/Minute auf /login + /register
- 429-Response mit Retry-After-Header bei Ueberschreitung

Limitierung der Limitierung:
- In-Memory-Store: überlebt keinen Server-Restart, nicht multi-process-fest
  (Render Free-Tier laeuft als 1 Worker, daher OK)
- IP-basiert: hinter Proxy/CDN muss X-Forwarded-For ausgewertet werden,
  Render setzt das automatisch — `get_remote_address` liest es korrekt
- Später (~bezahlter Plan, Multi-Worker): Redis-Backend via storage_uri
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

# Globaler Limiter — Single-Source-of-Truth für alle Auth-Endpoints.
# In main.py wird er als app.state.limiter gesetzt + Exception-Handler registriert.
limiter = Limiter(key_func=get_remote_address)

# Limits — bewusst konservativ. Bei Friends-Phase noch entspannbar wenn noetig.
LOGIN_LIMIT = "5/minute"
REGISTER_LIMIT = "5/minute"
REFRESH_LIMIT = "20/minute"  # legitime Clients refreshen alle ~14min, 20/min = viel Spielraum
