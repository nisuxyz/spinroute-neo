#!/bin/bash

# Cleanup script for development environment
set -e

echo "🧹 Cleaning up microservices platform from minikube..."

# Uninstall Helm release
helm uninstall microservices-dev --namespace microservices-dev || echo "Release not found"

# Delete namespace (this will remove all resources)
kubectl delete namespace microservices-dev --ignore-not-found=true

echo "✅ Cleanup complete!"
