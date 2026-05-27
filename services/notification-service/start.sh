#!/bin/bash

cd "$(dirname "$0")"

echo "Starting TOPEMS Notification Service..."

if [ ! -d "target/debug" ]; then
    echo "Building notification service..."
    cargo build
fi

if [ -f ".env" ]; then
    echo "Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
fi

RUST_LOG=notification_service=debug cargo run
