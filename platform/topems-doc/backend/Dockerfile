FROM rust:1.80-bookworm AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates
COPY --from=builder /app/target/release/topems-doc /usr/local/bin/
EXPOSE 8001
CMD ["topems-doc"]
