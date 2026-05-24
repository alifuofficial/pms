#!/bin/sh

echo "--- STARTING DEPLOYMENT STEPS ---"
echo "DATABASE_URL: $DATABASE_URL"
echo "DIRECT_URL: $DIRECT_URL"

echo "Verifying database upload directories..."
mkdir -p /app/data/uploads
chmod -R 777 /app/data

echo "Running database synchronization..."
if [ -n "$DIRECT_URL" ]; then
  echo "Overriding DATABASE_URL with DIRECT_URL for db push..."
  DATABASE_URL="$DIRECT_URL" npx prisma db push --accept-data-loss
else
  npx prisma db push --accept-data-loss
fi

echo "Seeding/Updating initial data..."
if [ -n "$DIRECT_URL" ]; then
  echo "Overriding DATABASE_URL with DIRECT_URL for seeding..."
  DATABASE_URL="$DIRECT_URL" node prisma/seed.js
else
  node prisma/seed.js
fi

echo "--- DEPLOYMENT STEPS COMPLETED ---"
echo "Starting application..."
node server.js
