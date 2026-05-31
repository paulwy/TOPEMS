# TOPEMS topems-doc Service Dockerfile
FROM rust:1.75-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . .

WORKDIR /app/platform/topems-doc/backend

RUN cargo build --release

RUN mkdir -p /app/logs

EXPOSE 8001

ENV RUST_LOG=info
ENV SERVICE_PORT=8001

ENTRYPOINT ["/app/platform/topems-doc/backend/target/release/topems-doc"]
CMD ["--host", "0.0.0.0", "--port", "8001"]
