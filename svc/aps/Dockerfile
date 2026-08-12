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

COPY --from=builder /app/target/release/topems-aps /usr/local/bin/topems-aps

EXPOSE 8043

CMD ["topems-aps"]
