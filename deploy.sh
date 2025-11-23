#!/bin/bash

# Guriri Express - Deploy Script for VPS
# Usage: ./deploy.sh

set -e

echo "🚀 Starting Guriri Express deployment..."

# Configuration
APP_DIR="/var/www/guriri-express/GuririExpress"
APP_NAME="guriri-express"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to app directory
cd $APP_DIR

echo -e "${YELLOW}📦 Pulling latest changes from Git...${NC}"
git pull origin main

echo -e "${YELLOW}📥 Installing dependencies...${NC}"
npm install --production=false

echo -e "${YELLOW}🏗️  Building frontend...${NC}"
npm run build

echo -e "${YELLOW}🔄 Restarting PM2 process...${NC}"
pm2 restart $APP_NAME

echo -e "${YELLOW}💾 Saving PM2 configuration...${NC}"
pm2 save

echo -e "${YELLOW}📊 Checking application status...${NC}"
pm2 status

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Application is running at https://www.guririexpress.com.br${NC}"

# Show logs
echo -e "${YELLOW}📝 Recent logs:${NC}"
pm2 logs $APP_NAME --lines 20 --nostream
