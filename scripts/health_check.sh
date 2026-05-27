#!/bin/bash

ENVIRONMENT=${1:-dev}
DEPLOY_DIR="/opt/topems/$ENVIRONMENT"
HEALTH_CHECK_LOG="$DEPLOY_DIR/logs/health_check.log"

TIMEOUT=30
INTERVAL=5
MAX_RETRIES=10

declare -A SERVICE_PORTS
SERVICE_PORTS=(
    ["backend"]=8080
    ["notification-service"]=8081
    ["report-service"]=8082
    ["topems-doc"]=8083
    ["topems-flow"]=8084
    ["topems-iam"]=8085
    ["topems-lims"]=8086
    ["topems-qms"]=8087
    ["topems-rs"]=8088
    ["topems-ehs"]=8089
    ["topems-srm"]=8090
    ["topems-ai"]=8091
)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$HEALTH_CHECK_LOG"
}

check_http_endpoint() {
    local url=$1
    local name=$2
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "204" ]; then
        return 0
    else
        return 1
    fi
}

check_tcp_port() {
    local host=$1
    local port=$2
    local name=$3
    
    if timeout $TIMEOUT bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

check_database() {
    log "Checking database connection..."
    
    if command -v psql &> /dev/null; then
        source "$DEPLOY_DIR/.env"
        
        if timeout $TIMEOUT psql -h ${POSTGRES_HOST:-localhost} \
                                  -U ${POSTGRES_USER:-topems} \
                                  -d ${POSTGRES_DB:-topems} \
                                  -c "SELECT 1" > /dev/null 2>&1; then
            log "✅ Database connection OK"
            return 0
        else
            log "❌ Database connection FAILED"
            return 1
        fi
    fi
    
    return 0
}

check_redis() {
    log "Checking Redis connection..."
    
    if command -v redis-cli &> /dev/null; then
        source "$DEPLOY_DIR/.env"
        
        if timeout $TIMEOUT redis-cli -h ${REDIS_HOST:-localhost} \
                                      -p ${REDIS_PORT:-6379} \
                                      ping | grep -q "PONG"; then
            log "✅ Redis connection OK"
            return 0
        else
            log "❌ Redis connection FAILED"
            return 1
        fi
    fi
    
    return 0
}

check_service() {
    local service=$1
    local port=$2
    
    log "Checking $service (port $port)..."
    
    if check_tcp_port "localhost" "$port" "$service"; then
        log "✅ $service is reachable on port $port"
        return 0
    else
        log "❌ $service is NOT reachable on port $port"
        return 1
    fi
}

check_service_health_endpoint() {
    local service=$1
    local url="http://localhost:${SERVICE_PORTS[$service]}/health"
    
    if check_http_endpoint "$url" "$service"; then
        log "✅ $service health check passed"
        return 0
    else
        log "❌ $service health check failed"
        return 1
    fi
}

wait_for_service() {
    local service=$1
    local port=$2
    local retries=$3
    
    log "Waiting for $service to be ready (max $retries retries)..."
    
    for i in $(seq 1 $retries); do
        if check_tcp_port "localhost" "$port" "$service"; then
            log "✅ $service is ready after $i attempts"
            return 0
        fi
        
        log "Attempt $i/$retries: $service not ready, waiting ${INTERVAL}s..."
        sleep $INTERVAL
    done
    
    log "❌ $service failed to become ready after $retries attempts"
    return 1
}

full_health_check() {
    log "=========================================="
    log "Starting full health check for $ENVIRONMENT"
    log "=========================================="
    
    mkdir -p "$DEPLOY_DIR/logs"
    : > "$HEALTH_CHECK_LOG"
    
    FAILED_SERVICES=()
    SUCCESS_COUNT=0
    FAIL_COUNT=0
    
    check_database || FAIL_COUNT=$((FAIL_COUNT + 1))
    check_redis || FAIL_COUNT=$((FAIL_COUNT + 1))
    
    for service in "${!SERVICE_PORTS[@]}"; do
        port=${SERVICE_PORTS[$service]}
        
        if wait_for_service "$service" "$port" "$MAX_RETRIES"; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
            
            if check_service_health_endpoint "$service"; then
                :
            fi
        else
            FAILED_SERVICES+=("$service:$port")
            FAIL_COUNT=$((FAIL_COUNT + 1))
        fi
    done
    
    log "=========================================="
    log "Health Check Summary"
    log "=========================================="
    log "Total services checked: ${#SERVICE_PORTS[@]}"
    log "Successful: $SUCCESS_COUNT"
    log "Failed: $FAIL_COUNT"
    
    if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
        log "Failed services:"
        for svc in "${FAILED_SERVICES[@]}"; do
            log "  - $svc"
        done
        return 1
    fi
    
    log "✅ All health checks passed!"
    return 0
}

quick_health_check() {
    log "Quick health check for $ENVIRONMENT..."
    
    check_database
    check_redis
    
    for service in "${!SERVICE_PORTS[@]}"; do
        port=${SERVICE_PORTS[$service]}
        check_tcp_port "localhost" "$port" "$service" || log "Warning: $service not responding"
    done
    
    log "Quick health check completed"
}

service_status() {
    log "Service status for $ENVIRONMENT..."
    
    for service in "${!SERVICE_PORTS[@]}"; do
        port=${SERVICE_PORTS[$service]}
        
        if check_tcp_port "localhost" "$port" "$service"; then
            echo "✅ $service (port $port): UP"
        else
            echo "❌ $service (port $port): DOWN"
        fi
    done
}

usage() {
    echo "Usage: $0 [full|quick|status|service] [environment]"
    echo ""
    echo "Commands:"
    echo "  full       Perform full health check with retries"
    echo "  quick      Perform quick health check"
    echo "  status     Show service status"
    echo "  service    Check specific service"
    echo ""
    echo "Environment: dev, staging, production (default: dev)"
    echo ""
    echo "Examples:"
    echo "  $0 full production"
    echo "  $0 quick dev"
    echo "  $0 status staging"
    exit 1
}

main() {
    COMMAND=${1:-full}
    ENVIRONMENT=${2:-dev}
    
    log "Starting health check for environment: $ENVIRONMENT"
    
    case $COMMAND in
        full)
            full_health_check
            ;;
        quick)
            quick_health_check
            ;;
        status)
            service_status
            ;;
        *)
            usage
            ;;
    esac
}

main "$@"
