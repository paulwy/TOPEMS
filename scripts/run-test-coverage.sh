#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==================================="
echo "  Running Rust Test Coverage"
echo "==================================="

if ! command -v cargo-tarpaulin &> /dev/null; then
    echo "Installing cargo-tarpaulin..."
    cargo install cargo-tarpaulin
fi

echo ""
echo "Running test coverage for services/backend..."
cd "$PROJECT_ROOT/services/backend"

cargo tarpaulin \
    --out html \
    --out xml \
    --out json \
    --exclude-files 'src/main.rs' \
    --fail-under 80 \
    --timeout 300

echo ""
echo "Coverage report generated in:"
echo "  - html: coverage/index.html"
echo "  - xml: cobertura.xml"
echo "  - json: tarpaulin-report.json"

echo ""
echo "==================================="
echo "  Test Coverage Complete"
echo "==================================="
