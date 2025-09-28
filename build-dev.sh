#!/bin/bash

# Build all container images for development
set -e

echo "🔨 Building all container images for development..."

# Set up minikube docker environment
# eval $(minikube docker-env)
inside_minikube="minikube ssh -- "

# Build frontend
echo "📦 Building frontend..."
current=$(pwd)
$inside_minikube "cd /host-home/${current/home\/$USER//} podman build -f Containerfile -t frontend:dev ."

# Build backend
echo "📦 Building backend..."
cd backend
podman build -f Containerfile -t api-gateway:dev .
cd ..

# Build all microservices
for service in services/*; do
    echo "📦 Building $service service..."
    cd $service
    podman build -f Containerfile -t "${service/services\//}-service:dev" .
    cd ../..
done

echo "✅ All images built successfully!"
echo ""
echo "🚀 You can now deploy with: ./deploy-dev.sh"
