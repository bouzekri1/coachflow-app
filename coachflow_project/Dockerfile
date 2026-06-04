FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dépendances système (psycopg, Pillow, reportlab)
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq5 libjpeg62-turbo zlib1g libfreetype6 libwebp7 \
      build-essential libpq-dev libjpeg-dev zlib1g-dev libfreetype6-dev libwebp-dev \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install -r requirements.txt \
 && apt-get purge -y --auto-remove build-essential libpq-dev libjpeg-dev zlib1g-dev libfreetype6-dev libwebp-dev

# User non-root + dossiers writeables (staticfiles + media en volumes nommés)
RUN useradd --create-home --shell /bin/bash app
COPY --chown=app:app . /app
RUN mkdir -p /app/staticfiles /app/media /app/static \
 && chown -R app:app /app/staticfiles /app/media /app/static

USER app

# collectstatic au runtime (lit STATIC_ROOT + l'env)
# → exécuté via la commande de démarrage docker-compose

EXPOSE 8000
CMD ["gunicorn", "coachflow_project.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
