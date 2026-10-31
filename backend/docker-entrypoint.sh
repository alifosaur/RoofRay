#!/usr/bin/env bash
set -e

echo "Starting RoofRay Solutions Backend Container..."

# Wait for PostgreSQL if DATABASE_URL points to postgres
if [[ "$DATABASE_URL" == *"postgres"* ]]; then
  echo "Waiting for PostgreSQL database to be ready..."
  python - << 'EOF'
import os
import time
import sys
from urllib.parse import urlparse
import psycopg2

db_url = os.getenv("DATABASE_URL", "")
max_retries = 30
retry_interval = 2

for attempt in range(max_retries):
    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        print("✓ Connected to PostgreSQL successfully!")
        sys.exit(0)
    except Exception as e:
        print(f"Waiting for PostgreSQL... ({attempt + 1}/{max_retries}): {e}")
        time.sleep(retry_interval)

print("ERROR: Could not connect to PostgreSQL within timeout.")
sys.exit(1)
EOF
fi

echo "Starting Uvicorn Server..."
exec "$@"

