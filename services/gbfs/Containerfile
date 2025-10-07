# Multi-stage build for PocketBase
FROM docker.io/golang:1.24-alpine as builder

# Set working directory
WORKDIR /spinroute

# Copy go mod files first for better caching
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the binary (using the command from package.json)
RUN GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -v -o ./bin/gbfs-service ./cmd/gbfs-service/main.go

# Final stage
FROM docker.io/alpine:latest

WORKDIR /spinroute

COPY . .

COPY --from=builder /spinroute/bin/gbfs-service ./gbfs-service

# Expose port
# EXPOSE 8090

# Health check
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#    CMD curl -f http://localhost:8090/api/health || exit 1

# ENV SPINROUTE_BOOTSTRAP_NETWORKS=false
# ENV SPINROUTE_BOOTSTRAP_COMPONENTS=false
# ENV SPINROUTE_CONSUME_WS=false
# ENV SPINROUTE_VERBOSE=false

# Default command
CMD ["/spinroute/gbfs-service"]
