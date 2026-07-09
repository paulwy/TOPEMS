# TOPEMS Report Service Dockerfile
# Multi-stage build optimized for workspace

FROM rust:1.78-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svc/report ./svc/report
RUN cargo build --release -p topems-report

FROM alpine:3.19
RUN apk add --no-cache libssl3 ca-certificates tzdata
RUN addgroup -S topems && adduser -S topems -G topems
WORKDIR /app
COPY --from=builder /app/target/release/topems-report /usr/local/bin/topems-report
RUN chown -R topems:topems /app
USER topems
ENV REPORT_PORT=8061
ENV RUST_LOG=info
EXPOSE 8061
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8061/health || exit 1
CMD ["topems-report"]
