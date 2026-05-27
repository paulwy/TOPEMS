# TOPEMS rs Service Dockerfile
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

RUN cp /app/target/release/topems-rs /app/

RUN mkdir -p /app/logs

EXPOSE 8005

ENV RUST_LOG=info
ENV SERVICE_PORT=8005

ENTRYPOINT ["/app/topems-rs"]
CMD ["--host", "0.0.0.0", "--port", "8005"]
