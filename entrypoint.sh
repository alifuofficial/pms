#!/bin/sh

# Set default DATABASE_URL if not provided (pointing to persistent volume)
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/prod.db"
fi

# Override .env if it exists in standalone to prevent Next.js workers from falling back to dev.db
if [ -f ".env" ]; then
  sed -i "s|file:./dev.db|$DATABASE_URL|g" .env
fi

echo "--- STARTING DEPLOYMENT STEPS ---"
echo "DATABASE_URL: $DATABASE_URL"

# Extract path from file: URL for verification
DB_PATH=$(echo $DATABASE_URL | sed 's/file://')
echo "Resolved DB Path: $DB_PATH"

echo "Verifying database permissions..."
mkdir -p /app/data/uploads
chown -R root:root /app/data
chmod -R 777 /app/data

echo "Current database files in /app/data/:"
ls -lh /app/data/

if [ -f "$DB_PATH" ]; then
  echo "Found existing database file at $DB_PATH ($(du -h "$DB_PATH" | cut -f1))"
else
  echo "No database file found at $DB_PATH. A new one will be created."
fi

echo "Running database synchronization..."
# Use global prisma for reliability. Removed --accept-data-loss to protect data from accidental destructive schema changes.
prisma db push --url "$DATABASE_URL"


echo "Seeding/Updating initial data..."
# Run seeding (upsert logic ensures no duplicates)
node prisma/seed.js

echo "--- DEPLOYMENT STEPS COMPLETED ---"
echo "Starting application..."
# Start the Next.js standalone server
node server.js

