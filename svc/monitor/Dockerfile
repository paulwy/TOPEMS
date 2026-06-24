# TOPEMS Monitor Service Dockerfile
# Multi-stage build for system monitoring service

# ============================================
# Stage 1: Build
# ============================================
FROM rust:1.78-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache musl-dev openssl-dev pkgconfig

# Copy workspace files for dependency caching
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib

# Build only monitor service to save time
RUN cargo build --release -p topems-monitor

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
COPY --from=builder /app/target/release/topems-monitor /usr/local/bin/topems-monitor

# Set ownership
RUN chown -R topems:topems /app

USER topems

# Environment defaults
ENV MONITOR_PORT=8062
ENV RUST_LOG=info

EXPOSE 8062

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8062/health || exit 1

CMD ["topems-monitor"]
