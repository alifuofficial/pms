#!/bin/sh

echo "--- STARTING DEPLOYMENT STEPS ---"
echo "DATABASE_URL: $DATABASE_URL"

echo "Verifying database upload directories..."
mkdir -p /app/data/uploads
chmod -R 777 /app/data

echo "Running database synchronization..."
npx prisma db push --accept-data-loss

echo "Seeding/Updating initial data..."
node prisma/seed.js

echo "--- DEPLOYMENT STEPS COMPLETED ---"
echo "Starting application..."
node server.js
