#!/bin/bash

# Smart Fault Analyser - Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting Smart Fault Analyser..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Add PostgreSQL to PATH if installed via pgAdmin
if [ -d "/Library/PostgreSQL/18/bin" ]; then
    export PATH="/Library/PostgreSQL/18/bin:$PATH"
elif [ -d "/Library/PostgreSQL/17/bin" ]; then
    export PATH="/Library/PostgreSQL/17/bin:$PATH"
elif [ -d "/Library/PostgreSQL/16/bin" ]; then
    export PATH="/Library/PostgreSQL/16/bin:$PATH"
fi

# Check if PostgreSQL is running
echo -e "${BLUE}📊 Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL tools not found in PATH${NC}"
    echo "   Continuing anyway..."
elif ! pg_isready -q 2>/dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL server may not be running${NC}"
    echo "   Please ensure PostgreSQL is started via pgAdmin 4"
    echo "   Continuing anyway..."
else
    echo -e "${GREEN}✅ PostgreSQL is running${NC}"
fi
echo ""

# Check if database exists
echo -e "${BLUE}🗄️  Checking database...${NC}"
echo "   (Skipping existence check, assuming database is set up via setup-first-time.sh)"
echo -e "${GREEN}✅ Proceeding to start servers${NC}"
echo ""

# Check if node_modules exist
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if [ ! -d "Backend/node_modules" ]; then
    echo "   Installing backend dependencies..."
    cd Backend && npm install && cd ..
fi

if [ ! -d "Frontend/node_modules" ]; then
    echo "   Installing frontend dependencies..."
    cd Frontend && npm install && cd ..
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}🔧 Starting Backend Server...${NC}"
cd Backend
npm start &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo "   Backend running at: http://localhost:3001"
echo ""

# Wait a moment for backend to initialize
sleep 2

# Start frontend in background
echo -e "${BLUE}🎨 Starting Frontend Server...${NC}"
cd Frontend
npm run dev &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

# Save PIDs to file for later cleanup
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Smart Fault Analyser is now running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📱 Frontend:${NC} http://localhost:5173"
echo -e "${BLUE}🔌 Backend:${NC}  http://localhost:3001"
echo ""
echo -e "${YELLOW}💡 To stop the servers, run: ./stop.sh${NC}"
echo -e "${YELLOW}💡 Or press Ctrl+C and then run: ./stop.sh${NC}"
echo ""

# Wait for user interrupt
wait
