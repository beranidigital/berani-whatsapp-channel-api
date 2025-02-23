#!/bin/bash

# Exit on error
set -e

echo "Building production image..."
docker build -t whatsapp-server:1.0.0 .

echo "Starting production stack..."
docker compose -f docker-compose.prod.yml up -d

echo "Cleaning up old images..."
docker image prune -f

echo "Deployment complete! Container health can be checked with:"
echo "docker compose -f docker-compose.prod.yml ps"
echo "docker logs whatsapp-server-prod"