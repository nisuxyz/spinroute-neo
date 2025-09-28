# Microservices Platform Helm Chart

A comprehensive Helm chart for deploying a microservices platform with:
- Astro frontend
- Hono/Bun API gateway
- Multiple Node.js/Bun microservices
- Automatic service discovery
- Ingress configuration
- Optional HPA (Horizontal Pod Autoscaling)

## Overview

This chart replaces the previous Kustomize configuration and provides a single, unified way to deploy all components of the microservices platform.

## Chart Structure

```
helm/
├── Chart.yaml              # Chart metadata
├── values.yaml            # Default configuration values
├── values-dev.yaml        # Development environment values
├── values-prod.yaml       # Production environment values
├── templates/
│   ├── backend.yaml       # API Gateway deployment & service
│   ├── frontend.yaml      # Astro frontend deployment & service
│   ├── microservices.yaml # Dynamic microservices deployments & services
│   ├── ingress.yaml       # Ingress configuration
│   ├── namespace.yaml     # Namespace creation
│   ├── hpa.yaml          # Horizontal Pod Autoscaler (optional)
│   └── NOTES.txt         # Post-deployment instructions
└── README.md             # This file
```

## Components Deployed

### Frontend (Astro)
- **Name**: `frontend`
- **Port**: 4321
- **Replicas**: Configurable (default: 2)
- **Path**: `/` (catches all non-API routes)

### Backend (API Gateway)
- **Name**: `api-gateway`
- **Port**: 3000
- **Replicas**: Configurable (default: 2)
- **Path**: `/api/*`
- **Features**: Automatic service discovery environment variables

### Microservices
Dynamically configured via `values.yaml`:
- **bikeshare-service**: Bike sharing functionality
- **fleet-service**: Fleet management
- **journey-service**: Journey planning
- **routing-service**: Route calculation

Each microservice automatically gets:
- Deployment with configurable replicas
- ClusterIP service
- Health checks (liveness & readiness probes)
- Resource limits and requests
- Environment variables

## Quick Start

### Prerequisites
- Kubernetes cluster
- Helm 3.x
- Container images built and available

### Basic Deployment

```bash
# Install with default values
helm install microservices-platform ./helm

# Install with development values
helm install microservices-platform ./helm -f ./helm/values-dev.yaml

# Install with production values
helm install microservices-platform ./helm -f ./helm/values-prod.yaml
```

### Environment-Specific Deployments

#### Development
```bash
helm install microservices-dev ./helm -f ./helm/values-dev.yaml
```

#### Production
```bash
helm install microservices-prod ./helm -f ./helm/values-prod.yaml
```

### Upgrading

```bash
# Upgrade with new values
helm upgrade microservices-platform ./helm -f ./helm/values-prod.yaml

# Upgrade with specific image tags
helm upgrade microservices-platform ./helm --set global.imageTag=v1.2.3
```

### Uninstalling

```bash
helm uninstall microservices-platform
```

## Configuration

### Key Configuration Options

#### Global Settings
- `global.namespace`: Kubernetes namespace
- `global.imageTag`: Default image tag for all services
- `global.imagePullPolicy`: Image pull policy

#### Adding/Removing Microservices
Edit `values.yaml` microservices array:

```yaml
microservices:
  - name: new-service
    enabled: true
    image:
      repository: new-service
      tag: latest
    replicas: 2
    port: 3000
    resources:
      limits:
        cpu: 300m
        memory: 256Mi
      requests:
        cpu: 100m
        memory: 128Mi
    env:
      - name: SERVICE_NAME
        value: "new-service"
```

#### Ingress Configuration
- `ingress.enabled`: Enable/disable ingress
- `ingress.host`: Domain name
- `ingress.tls.enabled`: Enable HTTPS/TLS
- `ingress.className`: Ingress controller class

#### Autoscaling
- `hpa.enabled`: Enable horizontal pod autoscaling
- `hpa.minReplicas`: Minimum pod count
- `hpa.maxReplicas`: Maximum pod count
- `hpa.targetCPUUtilizationPercentage`: CPU threshold

### Service Discovery

The API Gateway automatically receives environment variables for all enabled microservices:

```
BIKESHARE_SERVICE_URL=http://bikeshare-service.microservices-platform.svc.cluster.local
FLEET_SERVICE_URL=http://fleet-service.microservices-platform.svc.cluster.local
JOURNEY_SERVICE_URL=http://journey-service.microservices-platform.svc.cluster.local
ROUTING_SERVICE_URL=http://routing-service.microservices-platform.svc.cluster.local
```

## Monitoring & Debugging

### Check Status
```bash
# All resources
kubectl get all -n microservices-platform

# Specific service
kubectl get pods -n microservices-platform -l app=api-gateway
```

### View Logs
```bash
# All services
kubectl logs -n microservices-platform -l "release=microservices-platform" --tail=100 -f

# Specific service
kubectl logs -n microservices-platform -l "app=bikeshare-service" --tail=100 -f
```

### Port Forwarding for Local Access
```bash
# Frontend
kubectl port-forward -n microservices-platform svc/frontend 4321:80

# API Gateway
kubectl port-forward -n microservices-platform svc/api-gateway 3000:80

# Specific microservice
kubectl port-forward -n microservices-platform svc/bikeshare-service 3001:80
```

### Testing
```bash
# Validate templates without deploying
helm template microservices-platform ./helm

# Validate with specific values
helm template microservices-platform ./helm -f ./helm/values-prod.yaml

# Lint the chart
helm lint ./helm
```

## Migration from Kustomize

If you're migrating from the previous Kustomize setup:

1. **Remove old Kustomize files** (optional - keep for reference):
   ```bash
   # Backup existing kustomize configs
   mkdir -p backup/kustomize
   cp -r */k8s backup/kustomize/
   cp */kustomization.yaml backup/kustomize/
   ```

2. **Update your CI/CD pipelines** to use Helm instead of kubectl + kustomize:
   ```bash
   # Old way
   kubectl apply -k k8s/overlays/prod

   # New way
   helm upgrade --install microservices-platform ./helm -f ./helm/values-prod.yaml
   ```

3. **Environment variables**: Check that your applications can use the new service discovery environment variables.

## Advanced Configuration

### Custom Health Check Endpoints
If your services use different health check endpoints, modify the templates:

```yaml
# In values.yaml
microservices:
  - name: custom-service
    healthCheck:
      path: /custom-health
      port: 8080
```

### Resource Quotas
Add resource quotas to the namespace template if needed:

```yaml
# In templates/namespace.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: {{ .Values.global.namespace }}-quota
  namespace: {{ .Values.global.namespace }}
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
```

### Network Policies
Add network policies for additional security:

```yaml
# Create templates/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: {{ .Release.Name }}-network-policy
  namespace: {{ .Values.global.namespace }}
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: {{ .Values.global.namespace }}
```

## Troubleshooting

### Common Issues

1. **Images not found**: Ensure all container images are built and pushed to your registry
2. **Ingress not working**: Check ingress controller is installed and configured
3. **Services not starting**: Check resource limits and environment variables
4. **Health checks failing**: Verify health check endpoints return HTTP 200

### Useful Commands
```bash
# Check Helm release status
helm status microservices-platform

# View applied values
helm get values microservices-platform

# View all resources created
helm get manifest microservices-platform

# Debug template generation
helm template microservices-platform ./helm --debug

# Check events
kubectl get events -n microservices-platform --sort-by='.lastTimestamp'
```

## Contributing

To add a new microservice:
1. Add the service configuration to `values.yaml`
2. Update this README
3. Test the deployment with `helm template`
4. Submit a PR with your changes

## Support

For issues and questions:
- Check the troubleshooting section
- Review Kubernetes events and logs  
- Test with `helm template` to validate configuration
- Check that all required images exist and are accessible
