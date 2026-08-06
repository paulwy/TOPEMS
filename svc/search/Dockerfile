# syntax=docker/dockerfile:1
# TOPEMS Search Service Dockerfile
# Multi-stage build for global search service

# ============================================
# Stage 1: Build
# ============================================
FROM rust:nightly-2026-07-01-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/search ./svc/search

RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-search

# ============================================
# Stage 2: Runtime
# ============================================
FROM alpine:3.19

RUN apk add --no-cache libssl3 ca-certificates tzdata

RUN addgroup -S topems && adduser -S topems -G topems

WORKDIR /app

COPY --from=builder /app/target/release/topems-search /usr/local/bin/topems-search

RUN chown -R topems:topems /app

USER topems

ENV SEARCH_PORT=8082
ENV RUST_LOG=info

EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8082/health || exit 1

CMD ["topems-search"]
