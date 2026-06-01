#!/bin/bash

set -e

echo "=================================="
echo "  TOPEMS Backend Deployment Script"
echo "=================================="

# Configuration
SERVICE_NAME="topems-iam"
RUST_ENV="production"
BUILD_TARGET="x86_64-unknown-linux-gnu"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0;32m' # No Color

# Check for cargo
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Cargo not found! Please install Rust.${NC}"
    exit 1
fi

# Build for production
echo -e "${YELLOW}Building $SERVICE_NAME for production...${NC}"

# Build with optimizations
cd "services/$SERVICE_NAME/backend"

# Check if cross-compilation is needed
if [ "$(uname -s)" != "Linux" ] || [ "$(uname -m)" != "x86_64" ]; then
    echo -e "${YELLOW}Cross-compiling for $BUILD_TARGET...${NC}"
    cargo build --target "$BUILD_TARGET" --release --features redis-cache
else
    cargo build --release --features redis-cache
fi

echo -e "${GREEN}Build completed successfully!${NC}"

# Copy binary
echo -e "${YELLOW}Copying binary...${NC}"
BINARY_NAME="$SERVICE_NAME"
if [ "$(uname -s)" = "Darwin" ]; then
    BINARY_PATH="target/release/$BINARY_NAME"
else
    BINARY_PATH="target/$BUILD_TARGET/release/$BINARY_NAME"
fi

if [ -f "$BINARY_PATH" ]; then
    mkdir -p "../../../deploy/$SERVICE_NAME"
    cp "$BINARY_PATH" "../../../deploy/$SERVICE_NAME/"
    echo -e "${GREEN}Binary copied to:${NC} ../../deploy/$SERVICE_NAME/$BINARY_NAME"
else
    echo -e "${RED}Binary not found!${NC}"
    exit 1
fi

# Create systemd service file
echo -e "${YELLOW}Creating systemd service file...${NC}"
cat > "../../../deploy/$SERVICE_NAME/$SERVICE_NAME.service" << EOF
[Unit]
Description=TOPEMS IAM Service
After=network.target
After=postgresql.service
After=redis.service

[Service]
Type=simple
User=topems
Group=topems
WorkingDirectory=/opt/topems/$SERVICE_NAME
ExecStart=/opt/topems/$SERVICE_NAME/$BINARY_NAME
Restart=always
RestartSec=5
Environment=RUST_LOG=info
Environment=DATABASE_URL=postgres://topems:password@localhost/topems_iam
Environment=REDIS_URL=redis://localhost:6379/0
Environment=JWT_SECRET=your-secret-key-here-change-in-production
Environment=PORT=8002

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}Systemd service file created!${NC}"

cd ../../../

echo -e "\n=================================="
echo -e "${GREEN}Backend deployment preparation complete!${NC}"
echo "=================================="
echo -e "\nDeployment package created in: deploy/$SERVICE_NAME/"
echo -e "\nNext steps:"
echo "1. Copy deploy/$SERVICE_NAME/ to /opt/topems/$SERVICE_NAME/"
echo "2. Create topems user and group"
echo "3. Install systemd service: cp deploy/$SERVICE_NAME/$SERVICE_NAME.service /etc/systemd/system/"
echo "4. Enable and start the service"
echo "5. Configure Nginx reverse proxy"
