# syntax=docker/dockerfile:1
# TOPEMS Integration Service Dockerfile
# Multi-stage build for system integration service

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

# Build only integration service to save time
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-integration

# ============================================
# Stage 2: Runtime
# ============================================
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache libssl3 ca-certificates tzdata

# Create non-root user
RUN addgroup -S topems && adduser -S topems -G topems

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/topems-integration /usr/local/bin/topems-integration

# Set ownership
RUN chown -R topems:topems /app

USER topems

# Environment defaults
ENV INTEGRATION_PORT=8072
ENV RUST_LOG=info,service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug

EXPOSE 8072

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8072/health || exit 1

CMD ["topems-integration"]
