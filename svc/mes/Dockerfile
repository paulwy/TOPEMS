# syntax=docker/dockerfile:1
# TOPEMS MES Service Dockerfile
# Multi-stage build optimized for workspace

# ============================================
# Stage 1: Build
# ============================================
FROM rust:nightly-2026-07-01-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache musl-dev openssl-dev pkgconfig

# Copy workspace files
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/mes ./svc/mes

# Build the service
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-mes

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
COPY --from=builder /app/target/release/topems-mes /usr/local/bin/topems-mes

# Set ownership
RUN chown -R topems:topems /app

USER topems

# Environment defaults
ENV MES_PORT=8030
ENV RUST_LOG=info

EXPOSE 8030

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8030/health || exit 1

CMD ["topems-mes"]