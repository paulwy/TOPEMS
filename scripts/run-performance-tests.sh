#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==================================="
echo "  Running Performance Tests"
echo "==================================="

if ! command -v k6 &> /dev/null; then
    echo "Installing k6..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    else
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    fi
fi

echo ""
echo "Select test to run:"
echo "1. API Load Test"
echo "2. Page Load Test"
echo "3. Concurrent Users Test"
echo "4. All Performance Tests"
echo ""

read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo "Running API Load Test..."
        k6 run "$PROJECT_ROOT/tests/load/api-load-test.js"
        ;;
    2)
        echo "Running Page Load Test..."
        k6 run "$PROJECT_ROOT/tests/load/page-load-test.js"
        ;;
    3)
        echo "Running Concurrent Users Test..."
        k6 run "$PROJECT_ROOT/tests/load/concurrent-users-test.js"
        ;;
    4)
        echo "Running All Performance Tests..."
        k6 run "$PROJECT_ROOT/tests/load/api-load-test.js"
        k6 run "$PROJECT_ROOT/tests/load/page-load-test.js"
        k6 run "$PROJECT_ROOT/tests/load/concurrent-users-test.js"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "==================================="
echo "  Performance Tests Complete"
echo "==================================="
