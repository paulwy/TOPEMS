#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
DEPLOY_DIR="/opt/topems/$ENVIRONMENT"
MIGRATIONS_DIR="$DEPLOY_DIR/migrations"
LOG_DIR="$DEPLOY_DIR/logs"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_LOG="$LOG_DIR/migration-$TIMESTAMP.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$MIGRATION_LOG"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$MIGRATION_LOG"
    exit 1
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    if [ ! -d "$DEPLOY_DIR" ]; then
        error "Deployment directory $DEPLOY_DIR does not exist"
    fi
    
    if [ ! -f "$DEPLOY_DIR/.env" ]; then
        error "Environment file $DEPLOY_DIR/.env does not exist"
    fi
    
    source "$DEPLOY_DIR/.env"
    
    if ! command -v psql &> /dev/null; then
        error "psql command not found. Please install PostgreSQL client."
    fi
    
    mkdir -p "$LOG_DIR"
}

connect_database() {
    log "Connecting to database..."
    
    source "$DEPLOY_DIR/.env"
    
    export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
    
    if psql -h ${POSTGRES_HOST:-localhost} \
            -U ${POSTGRES_USER:-topems} \
            -d ${POSTGRES_DB:-topems} \
            -c "SELECT 1" > /dev/null 2>&1; then
        log "Database connection successful"
        return 0
    else
        error "Database connection failed"
    fi
}

create_migrations_table() {
    log "Creating migrations tracking table..."
    
    source "$DEPLOY_DIR/.env"
    
    export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
    
    psql -h ${POSTGRES_HOST:-localhost} \
         -U ${POSTGRES_USER:-topems} \
         -d ${POSTGRES_DB:-topems} \
         -c "
         CREATE TABLE IF NOT EXISTS schema_migrations (
             version VARCHAR(255) PRIMARY KEY,
             applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
             description TEXT,
             checksum VARCHAR(64)
         );
         " 2>&1 | tee -a "$MIGRATION_LOG"
    
    log "Migrations tracking table created/verified"
}

get_applied_migrations() {
    source "$DEPLOY_DIR/.env"
    
    export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
    
    psql -h ${POSTGRES_HOST:-localhost} \
         -U ${POSTGRES_USER:-topems} \
         -d ${POSTGRES_DB:-topems} \
         -t -A -c "SELECT version FROM schema_migrations ORDER BY applied_at;" 2>/dev/null || echo ""
}

apply_migration() {
    local migration_file=$1
    local filename=$(basename "$migration_file")
    local version=${filename%%_*}
    
    log "Applying migration: $filename"
    
    source "$DEPLOY_DIR/.env"
    
    export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
    
    psql -h ${POSTGRES_HOST:-localhost} \
         -U ${POSTGRES_USER:-topems} \
         -d ${POSTGRES_DB:-topems} \
         -v ON_ERROR_STOP=1 \
         -f "$migration_file" 2>&1 | tee -a "$MIGRATION_LOG"
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "Migration $filename applied successfully"
        
        psql -h ${POSTGRES_HOST:-localhost} \
             -U ${POSTGRES_USER:-topems} \
             -d ${POSTGRES_DB:-topems} \
             -c "INSERT INTO schema_migrations (version, description, checksum) 
                 VALUES ('$version', '$filename', '$(md5sum "$migration_file" | cut -d' ' -f1)')
                 ON CONFLICT (version) DO NOTHING;" 2>&1 | tee -a "$MIGRATION_LOG"
        
        return 0
    else
        error "Migration $filename failed"
    fi
}

rollback_migration() {
    local version=$1
    
    log "Rolling back migration: $version"
    
    source "$DEPLOY_DIR/.env"
    
    export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
    
    local rollback_file="$MIGRATIONS_DIR/rollback_${version}.sql"
    
    if [ -f "$rollback_file" ]; then
        log "Found rollback file: $rollback_file"
        
        psql -h ${POSTGRES_HOST:-localhost} \
             -U ${POSTGRES_USER:-topems} \
             -d ${POSTGRES_DB:-topems} \
             -v ON_ERROR_STOP=1 \
             -f "$rollback_file" 2>&1 | tee -a "$MIGRATION_LOG"
        
        psql -h ${POSTGRES_HOST:-localhost} \
             -U ${POSTGRES_USER:-topems} \
             -d ${POSTGRES_DB:-topems} \
             -c "DELETE FROM schema_migrations WHERE version = '$version';" 2>&1 | tee -a "$MIGRATION_LOG"
        
        log "Rollback of $version completed"
    else
        error "Rollback file for $version not found"
    fi
}

find_pending_migrations() {
    local applied=$(get_applied_migrations)
    local pending=()
    
    for migration in $(find "$MIGRATIONS_DIR" -name "*.sql" ! -name "rollback_*" | sort); do
        local filename=$(basename "$migration")
        local version=${filename%%_*}
        
        if ! echo "$applied" | grep -q "^${version}$"; then
            pending+=("$migration")
        fi
    done
    
    printf '%s\n' "${pending[@]}"
}

migrate() {
    log "Starting migration for environment: $ENVIRONMENT"
    
    check_prerequisites
    connect_database
    create_migrations_table
    
    local pending=($(find_pending_migrations))
    
    if [ ${#pending[@]} -eq 0 ]; then
        log "No pending migrations found"
        return 0
    fi
    
    log "Found ${#pending[@]} pending migration(s)"
    
    for migration in "${pending[@]}"; do
        apply_migration "$migration"
        
        if [ $? -ne 0 ]; then
            error "Migration failed. Check log: $MIGRATION_LOG"
        fi
    done
    
    log "All migrations applied successfully"
}

migrate:force() {
    local version=$1
    
    if [ -z "$version" ]; then
        error "Version required for force migration"
    fi
    
    log "Force marking migration $version as applied"
    
    check_prerequisites
    connect_database
    create_migrations_table
    
    source "$DEPLOY_DIR/.env"
    
    export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
    
    psql -h ${POSTGRES_HOST:-localhost} \
         -U ${POSTGRES_USER:-topems} \
         -d ${POSTGRES_DB:-topems} \
         -c "INSERT INTO schema_migrations (version, description) 
             VALUES ('$version', 'FORCED')
             ON CONFLICT (version) DO NOTHING;"
    
    log "Migration $version marked as applied"
}

status() {
    log "Migration status for environment: $ENVIRONMENT"
    
    check_prerequisites
    connect_database
    
    source "$DEPLOY_DIR/.env"
    
    export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
    
    echo ""
    echo "Applied migrations:"
    psql -h ${POSTGRES_HOST:-localhost} \
         -U ${POSTGRES_USER:-topems} \
         -d ${POSTGRES_DB:-topems} \
         -c "SELECT version, applied_at, description FROM schema_migrations ORDER BY applied_at;"
    
    echo ""
    echo "Pending migrations:"
    local pending=($(find_pending_migrations))
    if [ ${#pending[@]} -eq 0 ]; then
        echo "  No pending migrations"
    else
        for migration in "${pending[@]}"; do
            echo "  - $(basename "$migration")"
        done
    fi
}

redo() {
    local version=${1:-}
    
    if [ -z "$version" ]; then
        log "Redoing last migration..."
        version=$(get_applied_migrations | tail -1)
    fi
    
    if [ -z "$version" ]; then
        error "No migration to redo"
    fi
    
    log "Redoing migration: $version"
    
    check_prerequisites
    connect_database
    
    rollback_migration "$version"
    
    local migration_file=""
    for f in $(find "$MIGRATIONS_DIR" -name "*.sql" ! -name "rollback_*"); do
        if [[ $(basename "$f") == "${version}_"* ]]; then
            migration_file="$f"
            break
        fi
    done
    
    if [ -n "$migration_file" ]; then
        apply_migration "$migration_file"
    else
        error "Migration file for version $version not found"
    fi
}

seed() {
    log "Running database seed..."
    
    check_prerequisites
    connect_database
    
    local seed_file="$DEPLOY_DIR/seeds/seed.sql"
    
    if [ -f "$seed_file" ]; then
        log "Found seed file: $seed_file"
        
        source "$DEPLOY_DIR/.env"
        
        export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
        
        psql -h ${POSTGRES_HOST:-localhost} \
             -U ${POSTGRES_USER:-topems} \
             -d ${POSTGRES_DB:-topems} \
             -f "$seed_file" 2>&1 | tee -a "$MIGRATION_LOG"
        
        log "Seed completed"
    else
        log "No seed file found"
    fi
}

reset() {
    log "Resetting database..."
    
    read -p "Are you sure you want to reset the database? This will delete all data. Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "Reset cancelled"
        return 0
    fi
    
    check_prerequisites
    connect_database
    
    source "$DEPLOY_DIR/.env"
    
    export PGPASSWORD=${POSTGRES_PASSWORD:-topems_secret}
    
    log "Dropping all tables..."
    
    psql -h ${POSTGRES_HOST:-localhost} \
         -U ${POSTGRES_USER:-topems} \
         -d ${POSTGRES_DB:-topems} \
         -c "
         DROP SCHEMA public CASCADE;
         CREATE SCHEMA public;
         GRANT ALL ON SCHEMA public TO ${POSTGRES_USER:-topems};
         " 2>&1 | tee -a "$MIGRATION_LOG"
    
    migrate
    seed
    
    log "Database reset completed"
}

usage() {
    echo "Usage: $0 [migrate|rollback|status|redo|seed|reset|force] [environment] [version]"
    echo ""
    echo "Commands:"
    echo "  migrate              Run pending migrations"
    echo "  rollback [version]   Rollback a specific migration"
    echo "  status               Show migration status"
    echo "  redo [version]       Redo a migration (rollback + migrate)"
    echo "  seed                 Run database seed"
    echo "  reset                Reset database (WARNING: deletes all data)"
    echo "  force [version]      Force mark migration as applied"
    echo ""
    echo "Environment: dev, staging, production (default: dev)"
    echo ""
    echo "Examples:"
    echo "  $0 migrate production"
    echo "  $0 rollback 20240101120000 staging"
    echo "  $0 status dev"
    exit 1
}

main() {
    COMMAND=${1:-migrate}
    ENVIRONMENT=${2:-dev}
    VERSION=${3:-}
    
    # 创建日志目录（必须在调用 log() 之前执行）
    mkdir -p "$LOG_DIR"
    
    log "=========================================="
    log "TOPEMS Database Migration Tool"
    log "Environment: $ENVIRONMENT"
    log "Command: $COMMAND"
    log "=========================================="
    
    case $COMMAND in
        migrate)
            migrate
            ;;
        rollback)
            rollback_migration "$VERSION"
            ;;
        status)
            status
            ;;
        redo)
            redo "$VERSION"
            ;;
        seed)
            seed
            ;;
        reset)
            reset
            ;;
        force)
            migrate:force "$VERSION"
            ;;
        *)
            usage
            ;;
    esac
    
    log "Migration log saved to: $MIGRATION_LOG"
}

main "$@"
