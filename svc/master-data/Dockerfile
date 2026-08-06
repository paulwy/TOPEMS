# syntax=docker/dockerfile:1
# TOPEMS Master Data Service Dockerfile
# Multi-stage build for MDM / data governance AI service

# ============================================
# Stage 1: Build
# ============================================
FROM rust:nightly-2026-07-01-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/master-data ./svc/master-data

RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-master-data

# ============================================
# Stage 2: Runtime
# ============================================
FROM alpine:3.19

RUN apk add --no-cache libssl3 ca-certificates tzdata

RUN addgroup -S topems && adduser -S topems -G topems

WORKDIR /app

COPY --from=builder /app/target/release/topems-master-data /usr/local/bin/topems-master-data

RUN chown -R topems:topems /app

USER topems

ENV MASTER_DATA_PORT=8090
ENV RUST_LOG=info,service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8090/health || exit 1

CMD ["topems-master-data"]
