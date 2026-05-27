#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==================================="
echo "  Setting Up Test Environment"
echo "==================================="

echo ""
echo "1. Installing Rust test dependencies..."
echo "-----------------------------------"
cd "$PROJECT_ROOT/services/backend"

if command -v cargo &> /dev/null; then
    cargo fetch
    echo "Rust dependencies installed"
else
    echo "Warning: Rust/Cargo not found. Please install Rust first."
fi

echo ""
echo "2. Installing Frontend test dependencies..."
echo "-----------------------------------"
cd "$PROJECT_ROOT/frontend"

if command -v npm &> /dev/null; then
    npm install
    echo "Frontend dependencies installed"
else
    echo "Warning: npm not found. Please install Node.js first."
fi

echo ""
echo "3. Installing Playwright browsers..."
echo "-----------------------------------"
if command -v npx &> /dev/null; then
    npx playwright install --with-deps
    echo "Playwright browsers installed"
else
    echo "Warning: npx not found. Skipping Playwright installation."
fi

echo ""
echo "4. Installing k6 (for performance testing)..."
echo "-----------------------------------"
if command -v k6 &> /dev/null; then
    echo "k6 already installed"
else
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install k6
        else
            echo "Warning: Homebrew not found. Please install k6 manually."
        fi
    else
        echo "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
    fi
fi

echo ""
echo "5. Installing cargo-tarpaulin (for Rust coverage)..."
echo "-----------------------------------"
if command -v cargo &> /dev/null; then
    if cargo install cargo-tarpaulin 2>/dev/null; then
        echo "cargo-tarpaulin installed"
    else
        echo "Warning: Failed to install cargo-tarpaulin. Coverage may not work."
    fi
fi

echo ""
echo "==================================="
echo "  Test Environment Setup Complete"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Run backend tests: cd services/backend && cargo test"
echo "2. Run frontend tests: cd frontend && npm test"
echo "3. Run E2E tests: cd frontend && npm run e2e"
echo "4. Run performance tests: ./scripts/run-performance-tests.sh"
echo "5. Run coverage: ./scripts/run-test-coverage.sh"
