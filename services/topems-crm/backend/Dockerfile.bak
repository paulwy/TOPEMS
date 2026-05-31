# TOPEMS CRM Service Dockerfile
FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-crm/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-crm /app/

EXPOSE 8013

ENV RUST_LOG=info
ENV SERVICE_PORT=8013

ENTRYPOINT ["/app/topems-crm"]
CMD ["--host", "0.0.0.0", "--port", "8013"]