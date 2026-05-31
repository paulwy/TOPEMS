# TOPEMS backend Service Dockerfile
FROM rust:1.75-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . .

WORKDIR /app/services/backend/backend

RUN cargo build --release

RUN mkdir -p /app/logs

EXPOSE 8019

ENV RUST_LOG=info
ENV SERVICE_PORT=8019

ENTRYPOINT ["/app/services/backend/backend/target/release/backend"]
CMD ["--host", "0.0.0.0", "--port", "8019"]
