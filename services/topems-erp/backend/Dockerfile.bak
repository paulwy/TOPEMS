# TOPEMS ERP Service Dockerfile
FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-erp/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-erp /app/

EXPOSE 8014

ENV RUST_LOG=info
ENV SERVICE_PORT=8014

ENTRYPOINT ["/app/topems-erp"]
CMD ["--host", "0.0.0.0", "--port", "8014"]