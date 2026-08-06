# syntax=docker/dockerfile:1
FROM rust:nightly-2026-07-01-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN --mount=type=cache,target=/root/.cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release

FROM alpine:3.19

RUN apk add --no-cache libssl3 ca-certificates

# 创建非root用户
RUN addgroup -g 1000 appgroup && adduser -u 1000 -G appgroup -s /bin/sh -D appuser

COPY --from=builder /app/target/release/topems-gis /usr/local/bin/topems-gis

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8071/health || exit 1

USER appuser

EXPOSE 8071

CMD ["topems-gis"]
