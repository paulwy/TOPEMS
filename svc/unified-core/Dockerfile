# syntax=docker/dockerfile:1
# TOPEMS Unified Core Service Dockerfile
# Multi-stage build for unified-core (IAM + Doc + Flow + File + Communication + Tenant + Billing + AI + Monitor)

# ============================================
# Stage 1: Build
# ============================================
FROM rust:nightly-2026-07-01-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache musl-dev openssl-dev pkgconfig

# Copy workspace files for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/unified-core ./svc/unified-core

# Build only unified-core to save time
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-unified-core

# ============================================
# Stage 2: Runtime
# ============================================
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache libssl3 ca-certificates tzdata curl

# Create non-root user
RUN addgroup -S topems && adduser -S topems -G topems

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/topems-unified-core /usr/local/bin/topems-unified-core

# Set ownership
RUN chown -R topems:topems /app

USER topems

# Environment defaults
ENV CORE_PORT=8000
ENV RUST_LOG=info,service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug

# Module isolation defaults (P0-3: 模块级故障隔离)
ENV MODULE_IAM_ENABLED=true
ENV MODULE_IAM_MAX_CONNECTIONS=20
ENV MODULE_IAM_RATE_LIMIT=100
ENV MODULE_FLOW_ENABLED=true
ENV MODULE_FLOW_MAX_CONNECTIONS=30
ENV MODULE_FLOW_RATE_LIMIT=200
ENV MODULE_FILE_ENABLED=true
ENV MODULE_FILE_MAX_CONNECTIONS=15
ENV MODULE_FILE_RATE_LIMIT=50
ENV MODULE_DOC_ENABLED=true
ENV MODULE_DOC_MAX_CONNECTIONS=15
ENV MODULE_DOC_RATE_LIMIT=50
ENV MODULE_MAIL_ENABLED=true
ENV MODULE_MAIL_MAX_CONNECTIONS=10
ENV MODULE_MAIL_RATE_LIMIT=20
ENV MODULE_IM_ENABLED=true
ENV MODULE_IM_MAX_CONNECTIONS=10
ENV MODULE_IM_RATE_LIMIT=100
ENV MODULE_NOTIFICATION_ENABLED=true
ENV MODULE_NOTIFICATION_MAX_CONNECTIONS=10
ENV MODULE_NOTIFICATION_RATE_LIMIT=100
ENV MODULE_MONITOR_ENABLED=true
ENV MODULE_MONITOR_MAX_CONNECTIONS=5
ENV MODULE_MONITOR_RATE_LIMIT=100

# Prometheus metrics defaults (P0-4: Prometheus监控)
ENV METRICS_ENABLED=true
ENV METRICS_PATH=/metrics

# OpenAPI documentation defaults (P0-1: OpenAPI Schema)
ENV OPENAPI_ENABLED=true
ENV OPENAPI_PATH=/swagger-ui

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${CORE_PORT:-8000}/health || exit 1

CMD ["topems-unified-core"]
