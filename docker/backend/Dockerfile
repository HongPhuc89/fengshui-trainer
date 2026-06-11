FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    postgresql-client \
    ffmpeg \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY src/backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir uv \
    && uv pip install --system -r requirements.txt

# Copy project
COPY src/backend /app/src/backend

WORKDIR /app/src/backend
