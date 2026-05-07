#!/bin/sh

# Set default DATABASE_URL if not provided (pointing to persistent volume)
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/prod.db"
fi

echo "--- STARTING DEPLOYMENT STEPS ---"
echo "DATABASE_URL: $DATABASE_URL"

echo "Verifying database permissions..."
mkdir -p /app/data
chown -R root:root /app/data
chmod -R 777 /app/data

echo "Running database synchronization..."
# Use global prisma for reliability
prisma db push --url "$DATABASE_URL" --accept-data-loss --force-reset

echo "Verifying database file..."
ls -lh /app/data/

echo "Seeding initial data..."
node prisma/seed.js

echo "--- DEPLOYMENT STEPS COMPLETED ---"
echo "Starting application..."
node server.js
