# syntax=docker/dockerfile:1
# TOPEMS Feedback Service Dockerfile
# Multi-stage build for customer feedback management service

# ============================================
# Stage 1: Build
# ============================================
FROM rust:nightly-2026-07-01-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev pkgconfig

COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/feedback ./svc/feedback

RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-feedback

# ============================================
# Stage 2: Runtime
# ============================================
FROM alpine:3.19

RUN apk add --no-cache libssl3 ca-certificates tzdata

RUN addgroup -S topems && adduser -S topems -G topems

WORKDIR /app

COPY --from=builder /app/target/release/topems-feedback /usr/local/bin/topems-feedback

RUN chown -R topems:topems /app

USER topems

ENV FEEDBACK_PORT=8087
ENV RUST_LOG=info,service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug

EXPOSE 8087

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8087/health || exit 1

CMD ["topems-feedback"]
