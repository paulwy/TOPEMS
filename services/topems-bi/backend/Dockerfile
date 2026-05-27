# TOPEMS BI Service Dockerfile
FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-bi/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-bi /app/

EXPOSE 8018

ENV RUST_LOG=info
ENV SERVICE_PORT=8018

ENTRYPOINT ["/app/topems-bi"]
CMD ["--host", "0.0.0.0", "--port", "8018"]