# TOPEMS Integration Service Dockerfile
FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-integration/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-integration /app/

EXPOSE 8020

ENV RUST_LOG=info
ENV SERVICE_PORT=8020

ENTRYPOINT ["/app/topems-integration"]
CMD ["--host", "0.0.0.0", "--port", "8020"]