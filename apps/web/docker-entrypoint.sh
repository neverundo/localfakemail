#!/bin/sh
set -e

echo "Waiting for database..."
retries=30
until node -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.\$queryRaw\`SELECT 1\`.then(()=>p.\$disconnect()).then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; do
  retries=$((retries - 1))
  if [ "$retries" -le 0 ]; then
    echo "Database not ready"
    exit 1
  fi
  sleep 1
done

echo "Running migrations..."
npx prisma migrate deploy

echo "Starting web..."
exec node server.js
