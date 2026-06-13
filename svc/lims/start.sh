#!/bin/bash

cd "$(dirname "$0")"

export SERVER_PORT=8022
export DATABASE_URL="postgres://topems@localhost:5432/topems_lims"
export REDIS_URL="redis://localhost:6379"
export RUST_LOG=info

./target/release/topems-lims
