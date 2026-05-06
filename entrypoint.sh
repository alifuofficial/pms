#!/bin/sh

# Set default DATABASE_URL if not provided (pointing to persistent volume)
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/prod.db"
fi

echo "Verifying database permissions..."
ls -ld /app/data
touch /app/data/test.tmp && rm /app/data/test.tmp || echo "Warning: Data directory is NOT writable"

echo "Running database synchronization..."
npx prisma db push --url "$DATABASE_URL" --accept-data-loss --force-reset

echo "Seeding initial data..."
node prisma/seed.js

echo "Starting application..."
node server.js
