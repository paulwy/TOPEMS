#!/bin/bash

set -e

ENVIRONMENT=${1:-production}
DEPLOY_DIR="/opt/topems/$ENVIRONMENT"
RELEASES_DIR="$DEPLOY_DIR/releases"
CURRENT_LINK="$DEPLOY_DIR/current"
BACKUP_DIR="$DEPLOY_DIR/backups"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

backup() {
    log "Creating backup..."
    
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
    fi
    
    BACKUP_NAME="backup-$TIMESTAMP"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    mkdir -p "$BACKUP_PATH"
    
    if [ -L "$CURRENT_LINK" ]; then
        log "Backing up current release..."
        cp -r $(readlink -f "$CURRENT_LINK") "$BACKUP_PATH/release"
    fi
    
    log "Backing up database..."
    if command -v pg_dump &> /dev/null; then
        source "$DEPLOY_DIR/.env"
        pg_dump -h ${POSTGRES_HOST:-localhost} \
                -U ${POSTGRES_USER:-topems} \
                -d ${POSTGRES_DB:-topems} \
                -F c \
                -b \
                -v \
                -f "$BACKUP_PATH/database.dump"
    fi
    
    log "Backing up configuration..."
    if [ -f "$DEPLOY_DIR/.env" ]; then
        cp "$DEPLOY_DIR/.env" "$BACKUP_PATH/.env"
    fi
    
    if [ -d "$DEPLOY_DIR/config" ]; then
        cp -r "$DEPLOY_DIR/config" "$BACKUP_PATH/"
    fi
    
    tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
    rm -rf "$BACKUP_PATH"
    
    log "Backup created: $BACKUP_PATH.tar.gz"
    
    cleanup_old_backups
}

cleanup_old_backups() {
    log "Cleaning up old backups (keeping last 10)..."
    
    cd "$BACKUP_DIR"
    ls -t backup-*.tar.gz | tail -n +11 | xargs -r rm -f
    
    log "Backup cleanup completed"
}

rollback() {
    ROLLBACK_VERSION=${1:-}
    
    if [ -z "$ROLLBACK_VERSION" ]; then
        log "Available releases:"
        ls -1 "$RELEASES_DIR" | sort -r | head -5
        log ""
        read -p "Enter version to rollback (timestamp): " ROLLBACK_VERSION
    fi
    
    if [ ! -d "$RELEASES_DIR/$ROLLBACK_VERSION" ]; then
        error "Release $ROLLBACK_VERSION not found"
    fi
    
    log "Rolling back to version: $ROLLBACK_VERSION"
    
    if [ -L "$CURRENT_LINK" ]; then
        rm "$CURRENT_LINK"
    fi
    ln -s "$RELEASES_DIR/$ROLLBACK_VERSION" "$CURRENT_LINK"
    
    log "Symlink updated to $ROLLBACK_VERSION"
    
    restart_services
    
    log "Rollback completed successfully"
}

rollback_database() {
    DUMP_FILE=${1:-}
    
    if [ -z "$DUMP_FILE" ]; then
        log "Available database backups:"
        find "$BACKUP_DIR" -name "*.dump" -type f | sort -r | head -5
        log ""
        read -p "Enter database dump file to restore: " DUMP_FILE
    fi
    
    if [ ! -f "$DUMP_FILE" ]; then
        error "Database dump file $DUMP_FILE not found"
    fi
    
    log "Rolling back database..."
    
    source "$DEPLOY_DIR/.env"
    
    systemctl stop "topems-backend-$ENVIRONMENT" || true
    
    sleep 2
    
    pg_restore -h ${POSTGRES_HOST:-localhost} \
               -U ${POSTGRES_USER:-topems} \
               -d ${POSTGRES_DB:-topems} \
               --clean \
               --if-exists \
               -v \
               "$DUMP_FILE"
    
    log "Database restored successfully"
    
    restart_services
}

restart_services() {
    log "Restarting services..."
    
    SERVICES=(
        "topems-backend"
        "notification-service"
        "report-service"
        "topems-doc"
        "topems-flow"
        "topems-iam"
        "topems-lims"
        "topems-qms"
        "topems-rs"
        "topems-ehs"
        "topems-srm"
        "topems-ai"
    )
    
    for service in "${SERVICES[@]}"; do
        if systemctl is-active --quiet "$service-$ENVIRONMENT"; then
            log "Restarting $service..."
            systemctl restart "$service-$ENVIRONMENT"
        fi
    done
    
    sleep 5
    
    log "Services restarted"
}

list_backups() {
    log "Available backups:"
    echo ""
    ls -lh "$BACKUP_DIR" | grep -E "\.tar\.gz$|\.dump$" || echo "No backups found"
}

restore() {
    BACKUP_FILE=${1:-}
    
    if [ -z "$BACKUP_FILE" ]; then
        log "Available backups:"
        find "$BACKUP_DIR" -name "*.tar.gz" -type f | sort -r
        log ""
        read -p "Enter backup file to restore: " BACKUP_FILE
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file $BACKUP_FILE not found"
    fi
    
    log "Extracting backup..."
    TEMP_DIR="$BACKUP_DIR/temp-$TIMESTAMP"
    mkdir -p "$TEMP_DIR"
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    
    EXTRACTED_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d | tail -1)
    
    log "Restoring files..."
    if [ -d "$EXTRACTED_DIR/release" ]; then
        TARGET_DIR="$RELEASES_DIR/rollback-$TIMESTAMP"
        mv "$EXTRACTED_DIR/release" "$TARGET_DIR"
        
        if [ -L "$CURRENT_LINK" ]; then
            rm "$CURRENT_LINK"
        fi
        ln -s "$TARGET_DIR" "$CURRENT_LINK"
    fi
    
    if [ -f "$EXTRACTED_DIR/.env" ]; then
        cp "$EXTRACTED_DIR/.env" "$DEPLOY_DIR/.env"
    fi
    
    if [ -d "$EXTRACTED_DIR/config" ]; then
        cp -r "$EXTRACTED_DIR/config" "$DEPLOY_DIR/"
    fi
    
    rm -rf "$TEMP_DIR"
    
    log "Files restored. Restarting services..."
    restart_services
    
    log "Restore completed successfully"
}

usage() {
    echo "Usage: $0 [backup|rollback|rollback-database|restore|list|cleanup] [environment]"
    echo ""
    echo "Commands:"
    echo "  backup              Create a backup of current state"
    echo "  rollback [version]   Rollback to previous version"
    echo "  rollback-database   Rollback database to previous state"
    echo "  restore [file]      Restore from backup file"
    echo "  list                List available backups"
    echo "  cleanup             Clean up old backups"
    echo ""
    echo "Environment: dev, staging, production (default: production)"
    echo ""
    echo "Examples:"
    echo "  $0 backup production"
    echo "  $0 rollback 20240101120000 production"
    echo "  $0 restore /opt/topems/production/backups/backup-20240101120000.tar.gz"
    exit 1
}

main() {
    COMMAND=${1:-}
    ENVIRONMENT=${2:-production}
    
    if [ -z "$COMMAND" ]; then
        usage
    fi
    
    log "Starting rollback script for environment: $ENVIRONMENT"
    
    case $COMMAND in
        backup)
            backup
            ;;
        rollback)
            rollback "$3"
            ;;
        rollback-database)
            rollback_database "$3"
            ;;
        restore)
            restore "$3"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"
