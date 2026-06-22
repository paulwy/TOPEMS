# TOPEMS LIMS Service Dockerfile
FROM rust:1.78-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev openssl-dev pkgconfig
COPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY# TOPEMS QMS Service Dockerfile
FROM rust:1.78-alpine AS-lFROM rust:1.78ne:3.19
RUN apk adWORKDIR /app
RUN apk add --no-ccaRUN apk addRUCOPY Cargo.toml Cargo.lock ./
COPY lib ./lib
COPY svWOCOPY lib ./lib
COPY svc/qms erCOPY svc/qms reRUN cargo build --relr/
FROM alpine:3.19
RUN apk add --no-cacemsRUN apk add --nERRUN addgroup -S topems && adduser -S topems -G topem80WORKDIR /app
COPY --from=builder /app/target/releaseerCOPY --fromtrRUN chown -R topems:topems /app
USER topems
ENV QMS_PORT=8050
ENV RUST_LOG=alUSER topems
ENV QMS_PORT=8050
"]ENV QMS_PO> ENV RUST_LOG=infTOEXPOSE 8050
HEALkeHEALTHCHECEO  CMD wget --no-verbose --tries=1 --spider http://localhost:8050/healtRKCMD ["topems-qms"]
