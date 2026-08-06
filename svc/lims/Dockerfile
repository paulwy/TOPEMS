# syntax=docker/dockerfile:1
# TOPEMS LIMS Service Dockerfile
# Multi-stage build optimized for workspace

FROM rust:nightly-2026-07-01-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/lims ./svc/lims
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-lims

FROM alpine:3.19
RUN apk add --no-cache libssl3 ca-certificates tzdata
RUN addgroup -S topems && adduser -S topems -G topems
WORKDIR /app
COPY --from=builder /app/target/release/topems-lims /usr/local/bin/topems-lims
RUN chown -R topems:topems /app
USER topems
ENV LIMS_PORT=8051
ENV RUST_LOG=info
EXPOSE 8051
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8051/health || exit 1
CMD ["topems-lims"]
