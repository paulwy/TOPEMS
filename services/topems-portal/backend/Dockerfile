# TOPEMS Portal Service Dockerfile
FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-portal/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-portal /app/

EXPOSE 8021

ENV RUST_LOG=info
ENV SERVICE_PORT=8021

ENTRYPOINT ["/app/topems-portal"]
CMD ["--host", "0.0.0.0", "--port", "8021"]