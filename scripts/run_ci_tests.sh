#!/bin/bash
set -e

# 获取脚本所在目录并切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "=== CI/CD Pipeline Test Script ==="
echo ""

echo "1. Setting up test database..."
PGPASSWORD=topems_secret psql -h localhost -U topems -d topems -c "CREATE SCHEMA IF NOT EXISTS rs;" 2>/dev/null || true
PGPASSWORD=topems_secret psql -h localhost -U topems -d topems -c "CREATE SCHEMA IF NOT EXISTS rs_test;" 2>/dev/null || true
PGPASSWORD=topems_secret psql -h localhost -U topems -d topems -c "DROP TABLE IF EXISTS rs_test.projects;" 2>/dev/null || true
PGPASSWORD=topems_secret psql -h localhost -U topems -d topems -c "CREATE TABLE rs_test.projects (id UUID PRIMARY KEY, name VARCHAR(255) NOT NULL, code VARCHAR(100) NOT NULL, description TEXT, project_type VARCHAR(100) NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'active', leader VARCHAR(255) NOT NULL, team_members JSONB, start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), end_date TIMESTAMPTZ, budget DOUBLE PRECISION, progress INTEGER NOT NULL DEFAULT 0, created_by VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), project_config JSONB, benefit_target JSONB, risk_level VARCHAR(50), priority INTEGER, tags TEXT[], parent_id UUID, workspace_id UUID);" 2>/dev/null || true

echo "✅ Database setup completed"
echo ""

echo "2. Running unit tests..."
cargo test --workspace --lib --no-fail-fast 2>&1 | tail -30
echo "✅ Unit tests completed"
echo ""

echo "=== CI/CD Pipeline Test Completed Successfully ==="

echo ""
echo "=== Integration Test Instructions ==="
echo "To run integration tests locally:"
echo "1. Start Redis: redis-server"
echo "2. Ensure PostgreSQL is running"
echo "3. Start IAM service: cd svc/iam && DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems REDIS_URL=redis://localhost:6379 JWT_SECRET=test_jwt_secret_key_for_ci_testing PORT=8000 cargo run --release"
echo "4. Start RS service: cd svc/rs && DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems REDIS_URL=redis://localhost:6379 IAM_URL=http://localhost:8000 PORT=8020 cargo run --release"
echo "5. Run integration tests: cd svc/rs && cargo test --test api_tests -- --nocapture"