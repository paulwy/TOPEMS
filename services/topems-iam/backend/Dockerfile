# Build stage
FROM rust:1.70-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache musl-dev openssl-dev

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy main to build and cache dependencies
RUN mkdir src && echo 'fn main() { println!("dummy") }' > src/main.rs
RUN cargo build --release --features redis-cache

# Now copy actual source and build
COPY src ./src
RUN touch src/main.rs
RUN cargo build --release --features redis-cache

# Production stage
FROM alpine:latest AS production

WORKDIR /app

# Install necessary dependencies
RUN apk add --no-cache libgcc openssl-dev ca-certificates

# Copy binary from builder
COPY --from=builder /app/target/release/topems-iam .

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8002/api/health || exit 1

# Environment variables
ENV PORT=8002
ENV HOST=0.0.0.0

# Expose port
EXPOSE 8002

# Run
CMD ["./topems-iam"]
