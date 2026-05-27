#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==================================="
echo "  Running All Tests"
echo "==================================="

echo ""
echo "1. Running Backend Tests..."
echo "-----------------------------------"
cd "$PROJECT_ROOT/services/backend"
cargo test --lib
cargo test --test unit
cargo test --test integration

echo ""
echo "2. Running Frontend Unit Tests..."
echo "-----------------------------------"
cd "$PROJECT_ROOT/frontend"
npm test

echo ""
echo "==================================="
echo "  All Tests Complete"
echo "==================================="
