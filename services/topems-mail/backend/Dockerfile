# Build stage
FROM rust:1.70-alpine AS builder

WORKDIR /app

# Install dependencies
RUN apk add --no-cache musl-dev openssl-dev

# Copy manifests
COPY Cargo.toml ./

# Create dummy main to build and cache dependencies
RUN mkdir src && echo 'fn main() { println!("dummy") }' > src/main.rs
RUN mkdir -p src/api src/models src/services
RUN cargo build --release

# Now copy actual source and build
COPY src ./src
RUN touch src/main.rs
RUN cargo build --release

# Production stage
FROM alpine:latest AS production

WORKDIR /app

# Install necessary dependencies
RUN apk add --no-cache libgcc openssl-dev ca-certificates

# Copy binary from builder
COPY --from=builder /app/target/release/topems-mail .

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8027/health || exit 1

# Environment variables
ENV PORT=8027
ENV HOST=0.0.0.0

# Expose port
EXPOSE 8027

# Run
CMD ["./topems-mail"]
