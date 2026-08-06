# syntax=docker/dockerfile:1
# TOPEMS Communication Service Dockerfile
# Multi-stage build for notification/email/im/websocket service

# ============================================
# Stage 1: Build
# ============================================
FROM rust:nightly-2026-07-01-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/communication ./svc/communication

RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-communication

# ============================================
# Stage 2: Runtime
# ============================================
FROM alpine:3.19

RUN apk add --no-cache libssl3 ca-certificates tzdata

RUN addgroup -S topems && adduser -S topems -G topems

WORKDIR /app

COPY --from=builder /app/target/release/topems-communication /usr/local/bin/topems-communication

RUN chown -R topems:topems /app

USER topems

ENV COMMUNICATION_PORT=8084
ENV RUST_LOG=info,service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug

EXPOSE 8084

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8084/health || exit 1

CMD ["topems-communication"]
