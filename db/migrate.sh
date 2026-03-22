#!/bin/sh
set -e

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-diana}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-$(dirname "$0")/migrations}"

export PGPASSWORD="${PGPASSWORD:-admin}"

echo "Running migrations against $PGHOST:$PGPORT/$PGDATABASE"

psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" <<'SQL'
CREATE TABLE IF NOT EXISTS "schema_migration_diana" (
    "id"         SERIAL PRIMARY KEY,
    "filename"   VARCHAR(255) NOT NULL UNIQUE,
    "applied_at" TIMESTAMPTZ DEFAULT NOW()
);
SQL

for migration in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
    filename=$(basename "$migration")

    applied=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc \
        "SELECT COUNT(*) FROM schema_migration_diana WHERE filename = '$filename'")

    if [ "$applied" = "0" ]; then
        echo "Applying: $filename"
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f "$migration"
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c \
            "INSERT INTO schema_migration_diana (filename) VALUES ('$filename')"
        echo "Applied:  $filename"
    else
        echo "Skipping: $filename (already applied)"
    fi
done

echo "All migrations complete."
