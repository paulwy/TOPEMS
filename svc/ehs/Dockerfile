# syntax=docker/dockerfile:1
# TOPEMS EHS Service Dockerfile
# Multi-stage build optimized for workspace

FROM rust:nightly-2026-07-01-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/ehs ./svc/ehs
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-ehs

FROM alpine:3.19
RUN apk add --no-cache libssl3 ca-certificates tzdata
RUN addgroup -S topems && adduser -S topems -G topems
WORKDIR /app
COPY --from=builder /app/target/release/topems-ehs /usr/local/bin/topems-ehs
RUN chown -R topems:topems /app
USER topems
ENV EHS_PORT=8052
ENV RUST_LOG=info
EXPOSE 8052
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8052/health || exit 1
CMD ["topems-ehs"]
