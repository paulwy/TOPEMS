#!/bin/bash

# 更新需要 shared 库的服务的 Dockerfile
services=("ai" "lims" "qms" "ehs" "srm" "pdm")
ports=("8003" "8006" "8007" "8008" "8009" "8010")

for i in "${!services[@]}"; do
    service=${services[$i]}
    port=${ports[$i]}
    
    cat > "services/topems-${service}/backend/Dockerfile" << EOF
# TOPEMS ${service} Service Dockerfile
# 单阶段构建，使用 rust:nightly，包含 shared 库支持

FROM rust:nightly

WORKDIR /build

RUN apt-get update && apt-get install -y \\
    pkg-config \\
    libssl-dev \\
    ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /shared/lib /app/logs

COPY shared/lib /shared/lib
COPY services/topems-${service}/backend/ /build/

RUN cargo build --release

RUN cp /build/target/release/topems-${service} /app/

EXPOSE ${port}

ENV RUST_LOG=info
ENV SERVICE_PORT=${port}

ENTRYPOINT ["/app/topems-${service}"]
CMD ["--host", "0.0.0.0", "--port", "${port}"]
EOF
    echo "Updated services/topems-${service}/backend/Dockerfile"
done

echo "All Dockerfiles updated!"
