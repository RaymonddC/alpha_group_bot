#!/bin/bash

# Alpha Groups Database Initialization Script
# Runs all migrations in order to set up the database schema

set -e  # Exit on error

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-alpha_groups}

MIGRATIONS_DIR="backend/migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
  echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
  echo -e "${RED}[✗]${NC} $1"
}

print_info() {
  echo -e "${YELLOW}[i]${NC} $1"
}

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  print_error "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

print_info "Starting database initialization..."
print_info "Database: $DB_HOST:$DB_PORT/$DB_NAME"

# Wait for PostgreSQL to be ready
print_info "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    print_status "PostgreSQL is ready"
    break
  fi

  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    print_error "PostgreSQL did not start within $((max_attempts * 2)) seconds"
    exit 1
  fi

  sleep 2
done

# Run migrations in order
print_info "Running migrations..."

migrations=(
  "001_initial_schema.sql"
  "002_add_indexes.sql"
  "003_add_rls_policies.sql"
  "004_add_nonce_cleanup.sql"
  "005_seed_data.sql"
)

for migration in "${migrations[@]}"; do
  migration_file="$MIGRATIONS_DIR/$migration"

  if [ ! -f "$migration_file" ]; then
    print_error "Migration file not found: $migration_file"
    exit 1
  fi

  print_info "Running migration: $migration"

  PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$migration_file" > /dev/null 2>&1

  if [ $? -eq 0 ]; then
    print_status "Migration completed: $migration"
  else
    print_error "Migration failed: $migration"
    exit 1
  fi
done

# Verify database is ready
print_info "Verifying database..."
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -c "\dt" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  print_status "Database verification passed"
else
  print_error "Database verification failed"
  exit 1
fi

print_status "Database initialization complete!"
print_info "All migrations have been successfully applied"

# Print connection string for reference
echo ""
echo -e "${YELLOW}Connection String:${NC}"
echo "postgresql://$DB_USER:****@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

exit 0
