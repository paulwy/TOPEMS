# TOPEMS pdm Service Dockerfile
# 单阶段构建，使用 rust:nightly，包含 shared 库支持

FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-pdm/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-pdm /app/

EXPOSE 8010

ENV RUST_LOG=info
ENV SERVICE_PORT=8010

ENTRYPOINT ["/app/topems-pdm"]
CMD ["--host", "0.0.0.0", "--port", "8010"]
