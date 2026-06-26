# TOPEMS BI Service Dockerfile
# Multi-stage build optimized for workspace

FROM rust:1.78-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/bi ./svc/bi
RUN cargo build --release -p topems-bi

FROM alpine:3.19
RUN apk add --no-cache libssl3 ca-certificates tzdata
RUN addgroup -S topems && adduser -S topems -G topems
WORKDIR /app
COPY --from=builder /app/target/release/topems-bi /usr/local/bin/topems-bi
RUN chown -R topems:topems /app
USER topems
ENV BI_PORT=8060
ENV RUST_LOG=info
EXPOSE 8060
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8060/health || exit 1
CMD ["topems-bi"]
