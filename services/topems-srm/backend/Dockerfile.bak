# TOPEMS srm Service Dockerfile
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
COPY services/topems-srm/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-srm /app/

EXPOSE 8009

ENV RUST_LOG=info
ENV SERVICE_PORT=8009

ENTRYPOINT ["/app/topems-srm"]
CMD ["--host", "0.0.0.0", "--port", "8009"]
