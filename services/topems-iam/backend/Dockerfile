FROM rust:1.75-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY Cargo.toml Cargo.lock ./

RUN mkdir src && echo 'fn main() { println!("dummy") }' > src/main.rs
RUN cargo build --release --features redis-cache

COPY src ./src
RUN touch src/main.rs
RUN cargo build --release --features redis-cache

RUN mkdir -p /app/logs

EXPOSE 8002

ENV PORT=8002
ENV HOST=0.0.0.0

CMD ["/app/target/release/topems-iam"]
