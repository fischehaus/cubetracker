# Dockerfile fuer Coolify/Hetzner-Deploy (W.api-prefix).
# Spiegelt den bekannten-guten Render-Build: Python 3.12 + pip install . + uvicorn.
# psycopg2-binary / cryptography / bcrypt liefern manylinux-wheels -> kein
# Compiler noetig, daher schlankes slim-Image.
FROM python:3.12-slim

WORKDIR /app

COPY . .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

EXPOSE 8000
# --proxy-headers + --forwarded-allow-ips (W.ops-hardening, 2026-06-12):
# Ohne diese Flags sah uvicorn als Client-IP immer die IP des nginx-/Traefik-
# Containers -> der Per-IP-Rate-Limiter keyte ALLE Besucher auf dieselbe
# Proxy-IP (5 Login-Versuche/Minute GLOBAL = DoS-Hebel, und Brute-Force-
# Attribution wirkungslos). Mit den privaten Ranges als trusted hops liest
# uvicorn X-Forwarded-For von rechts: Traefik/nginx-Hops werden uebersprungen,
# die erste oeffentliche IP = echter Client. Vom Client vorgefaelschte
# XFF-Eintraege (weiter links) werden ignoriert -> nicht spoofbar.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", \
     "--forwarded-allow-ips", "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.1"]
