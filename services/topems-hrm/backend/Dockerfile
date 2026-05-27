# TOPEMS HRM Service Dockerfile
FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-hrm/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-hrm /app/

EXPOSE 8015

ENV RUST_LOG=info
ENV SERVICE_PORT=8015

ENTRYPOINT ["/app/topems-hrm"]
CMD ["--host", "0.0.0.0", "--port", "8015"]