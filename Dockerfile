# TOPEMS Rust 服务 Dockerfile 模板
# 单个服务的通用构建配置

ARG RUST_VERSION=1.75
ARG DEBIAN_VERSION=slim

FROM rust:${RUST_VERSION}-${DEBIAN_VERSION} AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 复制 Cargo.toml 先，利用 Docker 缓存
COPY Cargo.toml ./
COPY Cargo.lock ./ 2>/dev/null || true

# 复制源代码
COPY . .

# 构建参数
ARG SERVICE_PATH
ARG SERVICE_PORT
ARG SERVICE_NAME

WORKDIR /app/${SERVICE_PATH}

RUN cargo build --release

# 运行时阶段
FROM debian:${DEBIAN_VERSION}

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

ARG SERVICE_PATH
ARG SERVICE_PORT
ARG SERVICE_NAME

WORKDIR /app

COPY --from=builder /app/${SERVICE_PATH}/target/release/${SERVICE_NAME} ./

RUN mkdir -p /app/logs

EXPOSE ${SERVICE_PORT}

ENV RUST_LOG=info
ENV SERVICE_PORT=${SERVICE_PORT}

ENTRYPOINT ["./${SERVICE_NAME}"]
CMD ["--host", "0.0.0.0", "--port", "${SERVICE_PORT}"]
