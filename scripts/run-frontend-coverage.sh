#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==================================="
echo "  Running Frontend Test Coverage"
echo "==================================="

FRONTEND_DIR="$PROJECT_ROOT/frontend"

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
fi

cd "$FRONTEND_DIR"

echo ""
echo "Running Jest with coverage..."
npm run test:coverage

echo ""
echo "Coverage report generated in:"
echo "  - HTML: coverage/index.html"
echo "  - LCOV: coverage/lcov.info"
echo "  - JSON: coverage/coverage-final.json"

echo ""
echo "==================================="
echo "  Frontend Coverage Complete"
echo "==================================="
