# TOPEMS topems-ai Service Dockerfile
FROM rust:1.75-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . .

WORKDIR /app/services/topems-ai/backend

RUN cargo build --release

RUN mkdir -p /app/logs

EXPOSE 8003

ENV RUST_LOG=info
ENV SERVICE_PORT=8003

ENTRYPOINT ["/app/services/topems-ai/backend/target/release/topems-ai"]
CMD ["--host", "0.0.0.0", "--port", "8003"]
