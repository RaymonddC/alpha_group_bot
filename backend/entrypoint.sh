#!/bin/sh
set -e

echo "Running database migrations..."
node /app/scripts/migrate.js

echo "Starting server..."
exec node dist/index.js
