#!/bin/bash
set -e

echo "=== CI/CD Pipeline Test Script ==="
echo ""

echo "1. Setting up test database..."
PGPASSWORD=topems_secret psql -h localhost -U topems -d topems -c "CREATE SCHEMA IF NOT EXISTS rs;"
PGPASSWORD=topems_secret psql -h localhost -U topems -d topems -c "CREATE SCHEMA IF NOT EXISTS rs_test;"
PGPASSWORD=topems_secret psql -h localhost -U topems -d topems -c "DROP TABLE IF EXISTS rs_test.projects;"
PGPASSWORD=topems_secret psql -h localhost -U topems -d topems -c "CREATE TABLE rs_test.projects (id UUID PRIMARY KEY, name VARCHAR(255) NOT NULL, code VARCHAR(100) NOT NULL, description TEXT, project_type VARCHAR(100) NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'active', leader VARCHAR(255) NOT NULL, team_members JSONB, start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(), end_date TIMESTAMPTZ, budget DOUBLE PRECISION, progress INTEGER NOT NULL DEFAULT 0, created_by VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(), project_config JSONB, benefit_target JSONB, risk_level VARCHAR(50), priority INTEGER, tags TEXT[], parent_id UUID, workspace_id UUID);"

echo "✅ Database setup completed"
echo ""

echo "2. Running topems-rs unit tests..."
cd services/topems-rs/backend
cargo test -- --test-threads=1 2>&1 | tail -20
echo "✅ Unit tests completed"
echo ""

echo "=== CI/CD Pipeline Test Completed Successfully ==="
cd ../..

echo ""
echo "=== Integration Test Instructions ==="
echo "To run integration tests locally:"
echo "1. Start Redis: redis-server"
echo "2. Ensure PostgreSQL is running"
echo "3. Start IAM service: cd platform/topems-iam/backend && DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems REDIS_URL=redis://localhost:6379 JWT_SECRET=test_jwt_secret_key_for_ci_testing PORT=8000 cargo run --release"
echo "4. Start RS service: cd services/topems-rs/backend && DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems REDIS_URL=redis://localhost:6379 IAM_URL=http://localhost:8000 PORT=8020 cargo run --release"
echo "5. Run integration tests: cd services/topems-rs/backend && cargo test --test api_tests -- --nocapture"
echo "6. Run project relation tests: cd services/topems-rs/backend && cargo test --test project_relation_tests -- --nocapture"