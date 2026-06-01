#!/bin/bash

set -e

echo "=================================="
echo "  TOPEMS Frontend Deployment Script"
echo "=================================="

# Configuration
FRONTEND_DIR="frontend"
BUILD_DIR="dist"
ENV_FILE=".env.production"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exists
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    cd "$FRONTEND_DIR" && npm install && cd ..
fi

# Check if production env file exists
if [ ! -f "$FRONTEND_DIR/$ENV_FILE" ]; then
    echo -e "${YELLOW}Creating production environment file...${NC}"
    cat > "$FRONTEND_DIR/$ENV_FILE" << EOF
# Production Environment Variables
VITE_API_URL=https://api.topems.example.com
VITE_IAM_URL=https://iam.topems.example.com
VITE_DOC_URL=https://doc.topems.example.com
VITE_AI_URL=https://ai.topems.example.com
VITE_FLOW_URL=https://flow.topems.example.com
EOF
fi

# Build the frontend
echo -e "${YELLOW}Building frontend for production...${NC}"
cd "$FRONTEND_DIR"

# Check for build command
if ! npm run build 2>&1 | tail -5; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Build completed successfully!${NC}"

# Verify build output
if [ -d "$BUILD_DIR" ]; then
    echo -e "${YELLOW}Verifying build output...${NC}"
    ls -la "$BUILD_DIR/" | head -10
    echo -e "\n${GREEN}Build verification complete!${NC}"
    echo -e "\n${YELLOW}Deployment package ready in:${NC} $FRONTEND_DIR/$BUILD_DIR/"
else
    echo -e "${RED}Build directory not found!${NC}"
    exit 1
fi

cd ..

echo -e "\n=================================="
echo -e "${GREEN}Deployment preparation complete!${NC}"
echo "=================================="
echo -e "\nNext steps:"
echo "1. Copy $FRONTEND_DIR/$BUILD_DIR/ to your web server"
echo "2. Configure Nginx/Apache to serve the static files"
echo "3. Set proper CORS headers"
echo "4. Configure SSL/TLS"
