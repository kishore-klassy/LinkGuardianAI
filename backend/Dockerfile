# ─── Builder stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# ─── Runtime stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

# Install system dependencies for Playwright/Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
    libasound2 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /usr/local /usr/local

# Install Chromium for Playwright
RUN python -m playwright install chromium 2>&1

RUN adduser --disabled-password --gecos "" appuser

COPY app/ ./app/
COPY tests/ ./tests/

USER appuser

EXPOSE 8000

# Use shell form of CMD so we can read the PORT env var injected by Render
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
