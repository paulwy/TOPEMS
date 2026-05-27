#!/bin/bash

set -e

ENVIRONMENT=${1:-dev}
DEPLOY_DIR="/opt/topems/$ENVIRONMENT"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
    exit 1
}

install_systemd_services() {
    log "Installing systemd services for $ENVIRONMENT..."
    
    if [ ! -d "/opt/topems/$ENVIRONMENT" ]; then
        error "Deployment directory not found"
    fi
    
    SYSTEMD_DIR="/etc/systemd/system"
    
    cat > "$SYSTEMD_DIR/topems-backend-$ENVIRONMENT.service" << EOF
[Unit]
Description=TOPEMS Backend Service ($ENVIRONMENT)
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=topems
Group=topems
WorkingDirectory=$DEPLOY_DIR
Environment="RUST_LOG=info"
EnvironmentFile=$DEPLOY_DIR/.env
ExecStart=$DEPLOY_DIR/current/backend
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    cat > "$SYSTEMD_DIR/notification-service-$ENVIRONMENT.service" << EOF
[Unit]
Description=TOPEMS Notification Service ($ENVIRONMENT)
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=topems
Group=topems
WorkingDirectory=$DEPLOY_DIR
Environment="RUST_LOG=info"
EnvironmentFile=$DEPLOY_DIR/.env
ExecStart=$DEPLOY_DIR/current/notification-service
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    cat > "$SYSTEMD_DIR/report-service-$ENVIRONMENT.service" << EOF
[Unit]
Description=TOPEMS Report Service ($ENVIRONMENT)
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=topems
Group=topems
WorkingDirectory=$DEPLOY_DIR
Environment="RUST_LOG=info"
EnvironmentFile=$DEPLOY_DIR/.env
ExecStart=$DEPLOY_DIR/current/report-service
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    SERVICES=("topems-doc" "topems-flow" "topems-iam" "topems-lims" "topems-qms" "topems-rs" "topems-ehs" "topems-srm" "topems-ai")
    
    for service in "${SERVICES[@]}"; do
        cat > "$SYSTEMD_DIR/$service-$ENVIRONMENT.service" << EOF
[Unit]
Description=TOPEMS $service ($ENVIRONMENT)
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=topems
Group=topems
WorkingDirectory=$DEPLOY_DIR
Environment="RUST_LOG=info"
EnvironmentFile=$DEPLOY_DIR/.env
ExecStart=$DEPLOY_DIR/current/$service
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    done
    
    systemctl daemon-reload
    
    log "Systemd services installed"
}

enable_services() {
    log "Enabling services..."
    
    systemctl enable "topems-backend-$ENVIRONMENT"
    systemctl enable "notification-service-$ENVIRONMENT"
    systemctl enable "report-service-$ENVIRONMENT"
    
    SERVICES=("topems-doc" "topems-flow" "topems-iam" "topems-lims" "topems-qms" "topems-rs" "topems-ehs" "topems-srm" "topems-ai")
    for service in "${SERVICES[@]}"; do
        systemctl enable "$service-$ENVIRONMENT"
    done
    
    log "Services enabled"
}

start_services() {
    log "Starting services..."
    
    systemctl start "topems-backend-$ENVIRONMENT"
    systemctl start "notification-service-$ENVIRONMENT"
    systemctl start "report-service-$ENVIRONMENT"
    
    SERVICES=("topems-doc" "topems-flow" "topems-iam" "topems-lims" "topems-qms" "topems-rs" "topems-ehs" "topems-srm" "topems-ai")
    for service in "${SERVICES[@]}"; do
        systemctl start "$service-$ENVIRONMENT"
    done
    
    log "Services started"
}

stop_services() {
    log "Stopping services..."
    
    SERVICES=("topems-doc" "topems-flow" "topems-iam" "topems-lims" "topems-qms" "topems-rs" "topems-ehs" "topems-srm" "topems-ai")
    for service in "${SERVICES[@]}"; do
        systemctl stop "$service-$ENVIRONMENT" || true
    done
    
    systemctl stop "report-service-$ENVIRONMENT" || true
    systemctl stop "notification-service-$ENVIRONMENT" || true
    systemctl stop "topems-backend-$ENVIRONMENT" || true
    
    log "Services stopped"
}

status() {
    log "Service status for $ENVIRONMENT..."
    
    echo "topems-backend-$ENVIRONMENT: $(systemctl is-active "topems-backend-$ENVIRONMENT")"
    echo "notification-service-$ENVIRONMENT: $(systemctl is-active "notification-service-$ENVIRONMENT")"
    echo "report-service-$ENVIRONMENT: $(systemctl is-active "report-service-$ENVIRONMENT")"
    
    SERVICES=("topems-doc" "topems-flow" "topems-iam" "topems-lims" "topems-qms" "topems-rs" "topems-ehs" "topems-srm" "topems-ai")
    for service in "${SERVICES[@]}"; do
        echo "$service-$ENVIRONMENT: $(systemctl is-active "$service-$ENVIRONMENT")"
    done
}

usage() {
    echo "Usage: $0 [install|enable|start|stop|status|restart] [environment]"
    echo ""
    echo "Commands:"
    echo "  install   Install systemd service files"
    echo "  enable    Enable services to start on boot"
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  status    Show service status"
    echo "  restart   Restart all services"
    echo ""
    echo "Environment: dev, staging, production (default: dev)"
    exit 1
}

main() {
    COMMAND=${1:-}
    ENVIRONMENT=${2:-dev}
    
    if [ -z "$COMMAND" ]; then
        usage
    fi
    
    case $COMMAND in
        install)
            install_systemd_services
            ;;
        enable)
            enable_services
            ;;
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        status)
            status
            ;;
        restart)
            stop_services
            sleep 2
            start_services
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"
