# TOPEMS topems-erp Service Dockerfile
FROM rust:1.75-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . .

WORKDIR /app/services/topems-erp/backend

RUN cargo build --release

RUN mkdir -p /app/logs

EXPOSE 8009

ENV RUST_LOG=info
ENV SERVICE_PORT=8009

ENTRYPOINT ["/app/services/topems-erp/backend/target/release/topems-erp"]
CMD ["--host", "0.0.0.0", "--port", "8009"]
