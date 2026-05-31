# TOPEMS iam Service Dockerfile
# 单阶段构建，使用 rust:nightly 既构建也运行

FROM rust:nightly

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN cargo build --release

RUN cp /app/target/release/topems-iam /app/

RUN mkdir -p /app/logs

EXPOSE 8002

ENV RUST_LOG=info
ENV SERVICE_PORT=8002

ENTRYPOINT ["/app/topems-iam"]
CMD ["--host", "0.0.0.0", "--port", "8002"]
