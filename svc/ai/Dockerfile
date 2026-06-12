FROM rust:1.78-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev openssl-dev

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM alpine:3.19

RUN apk add --no-cache libssl3 ca-certificates

COPY --from=builder /app/target/release/topems-ai /usr/local/bin/topems-ai

EXPOSE 8050

CMD ["topems-ai"]
