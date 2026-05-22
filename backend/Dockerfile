FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings.production

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Collect static files (uses whitenoise; no DB required at build time)
RUN python manage.py collectstatic --noinput || true

# Create non-root user
RUN addgroup --system appgroup && adduser --system --group appuser
USER appuser

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Run gunicorn on port 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--threads", "4", "--timeout", "60", "config.wsgi:application"]
