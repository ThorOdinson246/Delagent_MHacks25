#!/bin/bash

# MHacks2025 - Complete System Startup Script
# This script starts all required services for the AI Agent Meeting System

echo "🚀 Starting MHacks2025 AI Agent Meeting System..."
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port)
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}Killing existing processes on port $port...${NC}"
        kill -9 $pids 2>/dev/null
        sleep 2
    fi
}

# Change to project directory
cd /home/pappu/MHacks2025

echo -e "${BLUE}📍 Current directory: $(pwd)${NC}"
echo ""

# Kill any existing processes on our ports
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
kill_port 8000  # Python agents
kill_port 3001  # Node.js backend  
kill_port 3000  # Frontend (in case it tries to use 3000)
kill_port 3002  # Frontend (current port)

echo ""

# Start Python Agents Backend (Port 8000)
echo -e "${BLUE}🐍 Starting Python Agents Backend (Port 8000)...${NC}"
cd backend_agents
if [ -f "api.py" ]; then
    python api.py &
    PYTHON_PID=$!
    echo -e "${GREEN}✅ Python Agents started (PID: $PYTHON_PID)${NC}"
    sleep 3
else
    echo -e "${RED}❌ Error: api.py not found in backend_agents/${NC}"
    exit 1
fi

# Start Node.js Backend (Port 3001)
echo -e "${BLUE}🟢 Starting Node.js Backend (Port 3001)...${NC}"
cd ../backend
if [ -f "app.js" ]; then
    node app.js &
    NODE_PID=$!
    echo -e "${GREEN}✅ Node.js Backend started (PID: $NODE_PID)${NC}"
    sleep 3
else
    echo -e "${RED}❌ Error: app.js not found in backend/${NC}"
    exit 1
fi

# Start Frontend (Port 3002)
echo -e "${BLUE}⚛️  Starting Frontend (Port 3002)...${NC}"
cd ../frontend
if [ -f "package.json" ]; then
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
    sleep 5
else
    echo -e "${RED}❌ Error: package.json not found in frontend/${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo "================================================="
echo -e "${BLUE}📊 Service Status:${NC}"
echo -e "  🐍 Python Agents:  http://localhost:8000 (PID: $PYTHON_PID)"
echo -e "  🟢 Node.js Backend: http://localhost:3001 (PID: $NODE_PID)"  
echo -e "  ⚛️  Frontend:       http://localhost:3002 (PID: $FRONTEND_PID)"
echo ""
echo -e "${YELLOW}🌐 Open your browser to: http://localhost:3002${NC}"
echo -e "${YELLOW}📱 Dashboard URL:        http://localhost:3002/dashboard${NC}"
echo ""
echo -e "${BLUE}💡 Features Available:${NC}"
echo "  • 🎤 Voice-to-Text with Cartesia STT"
echo "  • 🔊 Text-to-Speech with Cartesia TTS"
echo "  • 🤖 3-Agent Negotiation (Alice, Pappu, Charlie)"
echo "  • 📅 Real-time Calendar Management"
echo "  • 🧠 Live Agent Thinking Visualization"
echo "  • ⚡ WebSocket Real-time Updates"
echo ""
echo -e "${GREEN}✨ Ready to demo the most advanced multi-agent system! ✨${NC}"
echo ""
echo -e "${YELLOW}To stop all services, run: ./stop-all.sh${NC}"
echo "Or press Ctrl+C to stop this script and manually kill processes"

# Keep script running and show logs
echo ""
echo -e "${BLUE}📋 Monitoring services... (Press Ctrl+C to stop)${NC}"
echo "================================================="

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping all services...${NC}"
    kill $PYTHON_PID $NODE_PID $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for all background processes
wait
