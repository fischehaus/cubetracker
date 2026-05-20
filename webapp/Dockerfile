# Dockerfile fuer Coolify/Hetzner-Deploy (W.api-prefix).
# Spiegelt den bekannten-guten Render-Build: Python 3.12 + pip install . + uvicorn.
# psycopg2-binary / cryptography / bcrypt liefern manylinux-wheels -> kein
# Compiler noetig, daher schlankes slim-Image.
FROM python:3.12-slim

WORKDIR /app

COPY . .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
