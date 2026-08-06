# syntax=docker/dockerfile:1
# TOPEMS QMS Service Dockerfile
FROM rust:nightly-2026-07-01-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/qms ./svc/qms
RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release -p topems-qms

FROM alpine:3.19
RUN apk add --no-cache libssl3 ca-certificates tzdata
RUN addgroup -S topems && adduser -S topems -G topems
WORKDIR /app
COPY --from=builder /app/target/release/topems-qms /usr/local/bin/topems-qms
RUN chown -R topems:topems /app
USER topems
ENV QMS_PORT=8050
ENV RUST_LOG=info,service_discovery=info,rd::ai_integration=info,portal::federation_gateway=debug,portal::graphql_schema=debug,portal::intelligent_gateway=debug
EXPOSE 8050
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8050/health || exit 1
CMD ["topems-qms"]
