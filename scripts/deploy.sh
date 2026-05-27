#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
DEPLOY_DIR="/opt/topems/$ENVIRONMENT"
LOG_DIR="$DEPLOY_DIR/logs"
CURRENT_LINK="$DEPLOY_DIR/current"
RELEASES_DIR="$DEPLOY_DIR/releases"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
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
}

pre_deployment() {
    log "Pre-deployment tasks..."
    
    mkdir -p "$RELEASES_DIR/$TIMESTAMP"
    mkdir -p "$LOG_DIR"
    
    log "Creating release directory: $RELEASES_DIR/$TIMESTAMP"
}

deploy_backend_services() {
    log "Deploying backend services..."
    
    BACKEND_SERVICES=(
        "backend"
        "notification-service"
        "report-service"
    )
    
    PLATFORM_SERVICES=(
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
    
    for service in "${BACKEND_SERVICES[@]}"; do
        if [ -f "services/$service/target/release/$service" ]; then
            log "Deploying $service..."
            cp "services/$service/target/release/$service" "$RELEASES_DIR/$TIMESTAMP/"
            
            if systemctl is-active --quiet "$service-$ENVIRONMENT"; then
                systemctl restart "$service-$ENVIRONMENT"
                log "Restarted $service"
            fi
        fi
    done
    
    for service in "${PLATFORM_SERVICES[@]}"; do
        if [ -f "platform/$service/backend/target/release/$service" ]; then
            log "Deploying $service..."
            cp "platform/$service/backend/target/release/$service" "$RELEASES_DIR/$TIMESTAMP/"
            
            if systemctl is-active --quiet "$service-$ENVIRONMENT"; then
                systemctl restart "$service-$ENVIRONMENT"
                log "Restarted $service"
            fi
        fi
    done
}

deploy_frontend() {
    log "Deploying frontend..."
    
    if [ -d "frontend/dist" ]; then
        cp -r frontend/dist "$RELEASES_DIR/$TIMESTAMP/frontend"
        log "Frontend deployed"
    else
        log "Warning: Frontend dist directory not found"
    fi
}

update_symlink() {
    log "Updating symlink..."
    
    if [ -L "$CURRENT_LINK" ]; then
        rm "$CURRENT_LINK"
    fi
    
    ln -s "$RELEASES_DIR/$TIMESTAMP" "$CURRENT_LINK"
    log "Symlink updated to $RELEASES_DIR/$TIMESTAMP"
}

post_deployment() {
    log "Post-deployment tasks..."
    
    find "$RELEASES_DIR" -maxdepth 1 -type d -mtime +7 ! -name "$TIMESTAMP" -exec rm -rf {} \; 2>/dev/null || true
    
    log "Cleaning up old releases (keeping last 7 days)"
}

restart() {
    log "Restarting all services..."
    
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
    
    log "All services restarted"
}

rolling_update() {
    log "Performing rolling update..."
    
    SERVICES=(
        "topems-backend"
        "notification-service"
        "report-service"
    )
    
    for service in "${SERVICES[@]}"; do
        if systemctl is-active --quiet "$service-$ENVIRONMENT"; then
            log "Rolling update $service..."
            
            systemctl stop "$service-$ENVIRONMENT"
            sleep 2
            
            if [ -f "$CURRENT_LINK/$service" ]; then
                cp "$CURRENT_LINK/$service" "/usr/local/bin/$service"
                chmod +x "/usr/local/bin/$service"
            fi
            
            systemctl start "$service-$ENVIRONMENT"
            
            sleep 5
            
            if systemctl is-active --quiet "$service-$ENVIRONMENT"; then
                log "$service updated successfully"
            else
                error "Failed to update $service"
            fi
        fi
    done
    
    log "Rolling update completed"
}

status() {
    log "Checking service status..."
    
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
            echo "✅ $service-$ENVIRONMENT: running"
        else
            echo "❌ $service-$ENVIRONMENT: stopped"
        fi
    done
}

usage() {
    echo "Usage: $0 [deploy|restart|rolling-update|status] [environment]"
    echo ""
    echo "Commands:"
    echo "  deploy          Deploy new version"
    echo "  restart         Restart all services"
    echo "  rolling-update  Perform rolling update"
    echo "  status          Check service status"
    echo ""
    echo "Environment: dev, staging, production (default: dev)"
    echo ""
    echo "Example:"
    echo "  $0 deploy staging"
    echo "  $0 restart production"
    exit 1
}

main() {
    COMMAND=${1:-deploy}
    ENVIRONMENT=${2:-dev}
    
    log "Starting deployment command: $COMMAND for environment: $ENVIRONMENT"
    
    case $COMMAND in
        deploy)
            check_prerequisites
            pre_deployment
            deploy_backend_services
            deploy_frontend
            update_symlink
            post_deployment
            log "Deployment completed successfully"
            ;;
        restart)
            restart
            ;;
        rolling-update)
            rolling_update
            ;;
        status)
            status
            ;;
        *)
            usage
            ;;
    esac
}

if [ "${1}" == "" ] || [ "${2}" != "" ]; then
    main "$@"
else
    main "$@"
fi
