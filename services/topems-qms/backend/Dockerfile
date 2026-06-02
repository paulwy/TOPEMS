# TOPEMS topems-qms Service Dockerfile
FROM sha256:70c2a016184099262fd7cee46f3d35fec3568c45c62f87e37f7f665f766b1f74

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY . .

WORKDIR /app/services/topems-qms/backend

RUN cargo build --release

RUN mkdir -p /app/logs

EXPOSE 8007

ENV RUST_LOG=info
ENV SERVICE_PORT=8007

ENTRYPOINT ["/app/services/topems-qms/backend/target/release/topems-qms"]
CMD ["--host", "0.0.0.0", "--port", "8007"]
