# TOPEMS MES Service Dockerfile
FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-mes/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-mes /app/

EXPOSE 8012

ENV RUST_LOG=info
ENV SERVICE_PORT=8012

ENTRYPOINT ["/app/topems-mes"]
CMD ["--host", "0.0.0.0", "--port", "8012"]