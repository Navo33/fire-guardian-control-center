#!/bin/bash

# Bash script to build and run backend and frontend in production mode

BACKEND_PATH="${0%/*}/backend"
FRONTEND_PATH="${0%/*}/frontend"

# Colors for output
INFO='\033[0;36m'
SUCCESS='\033[0;32m'
ERROR='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${INFO}========================================"
echo -e "Fire Guardian - Build and Run Script${NC}"
echo -e "${INFO}========================================${NC}"

# Build Backend
echo -e "\n${INFO}Building Backend...${NC}"
cd "$BACKEND_PATH"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${ERROR}Backend build failed!${NC}"
    exit 1
fi
echo -e "${SUCCESS}Backend build completed successfully!${NC}"

# Build Frontend
echo -e "\n${INFO}Building Frontend...${NC}"
cd "$FRONTEND_PATH"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${ERROR}Frontend build failed!${NC}"
    exit 1
fi
echo -e "${SUCCESS}Frontend build completed successfully!${NC}"

# Start Backend in background
echo -e "\n${INFO}Starting Backend (production mode)...${NC}"
cd "$BACKEND_PATH"
npm start &
BACKEND_PID=$!

sleep 3

# Start Frontend
echo -e "${INFO}Starting Frontend (production mode)...${NC}"
cd "$FRONTEND_PATH"
npm start

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT

echo -e "\n${SUCCESS}========================================"
echo -e "Both applications are now running!${NC}"
echo -e "${INFO}Backend: http://localhost:5000${NC}"
echo -e "${INFO}Frontend: http://localhost:3000${NC}"
echo -e "${SUCCESS}========================================${NC}"
