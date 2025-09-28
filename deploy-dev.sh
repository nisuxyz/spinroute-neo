#!/bin/bash

# Deploy script for development environment with minikube
set -e

echo "🚀 Deploying microservices platform to minikube..."

# Check if minikube is running
if ! minikube status | grep -q "Running"; then
    echo "❌ Minikube is not running. Please start minikube first:"
    echo "   bun run minikube:start"
    exit 1
fi

# Get minikube IP
MINIKUBE_IP=$(minikube ip)
echo "📍 Minikube IP: $MINIKUBE_IP"

# Update ingress host in values-dev.yaml if needed
sed -i "s/host: .*/host: $MINIKUBE_IP.nip.io/" ./helm/values-dev.yaml

# Deploy with Helm
echo "🔧 Installing/upgrading Helm chart..."
helm upgrade --install microservices-dev ./helm \
  -f ./helm/values-dev.yaml \
  --create-namespace \
  --wait \
  --timeout=5m

echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your application at:"
echo "   Frontend: http://$MINIKUBE_IP.nip.io/"
echo "   API Gateway: http://$MINIKUBE_IP.nip.io/api"
echo ""
echo "📊 Check deployment status:"
echo "   kubectl get all -n microservices-dev"
echo ""
echo "📝 View logs:"
echo "   kubectl logs -n microservices-dev -l component=frontend -f"
echo "   kubectl logs -n microservices-dev -l component=backend -f"
echo "   kubectl logs -n microservices-dev -l component=microservice -f"
