#!/bin/bash

# Setup Test Database
# This script creates and migrates the test database

set -e

echo "🚀 Setting up test database..."

# Load test environment variables
if [ -f .env.test ]; then
  export $(cat .env.test | grep -v '^#' | xargs)
else
  echo "❌ .env.test file not found. Please create it from .env.test.example"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set in .env.test"
  exit 1
fi

echo "📦 Running Prisma migrations on test database..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "🌱 Seeding test database (optional)..."
# Uncomment if you have a seed script for tests
# npx prisma db seed

echo "✅ Test database setup complete!"
echo "Database URL: $DATABASE_URL"
