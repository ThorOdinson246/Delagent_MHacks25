#!/bin/bash

# MHacks2025 - Stop All Services Script
# This script stops all running services for the AI Agent Meeting System

echo "🛑 Stopping MHacks2025 AI Agent Meeting System..."
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local service_name=$2
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}🔪 Stopping $service_name (Port $port)...${NC}"
        kill -9 $pids 2>/dev/null
        sleep 1
        
        # Verify the processes are killed
        local remaining=$(lsof -ti:$port 2>/dev/null)
        if [ -z "$remaining" ]; then
            echo -e "${GREEN}✅ $service_name stopped${NC}"
        else
            echo -e "${RED}❌ Failed to stop $service_name${NC}"
        fi
    else
        echo -e "${BLUE}ℹ️  $service_name not running (Port $port)${NC}"
    fi
}

# Kill processes by name pattern
kill_by_pattern() {
    local pattern=$1
    local service_name=$2
    local pids=$(pgrep -f "$pattern" 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}🔪 Stopping $service_name processes...${NC}"
        pkill -f "$pattern" 2>/dev/null
        sleep 1
        echo -e "${GREEN}✅ $service_name processes stopped${NC}"
    else
        echo -e "${BLUE}ℹ️  No $service_name processes found${NC}"
    fi
}

echo -e "${BLUE}🧹 Cleaning up all services...${NC}"
echo ""

# Stop services by port
kill_port 8000 "Python Agents Backend"
kill_port 3001 "Node.js Backend"
kill_port 3002 "Frontend (Next.js)"
kill_port 3000 "Frontend (fallback)"

echo ""

# Stop services by process pattern (backup method)
echo -e "${BLUE}🔍 Checking for remaining processes...${NC}"
kill_by_pattern "python.*api\.py" "Python API"
kill_by_pattern "node.*app\.js" "Node.js Backend"
kill_by_pattern "npm.*dev" "NPM Dev Server"

echo ""
echo -e "${GREEN}🎉 All services stopped successfully!${NC}"
echo "================================================="
echo -e "${BLUE}📊 Port Status:${NC}"

# Check if ports are now free
for port in 8000 3001 3002 3000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "  Port $port: ${RED}Still in use${NC}"
    else
        echo -e "  Port $port: ${GREEN}Free${NC}"
    fi
done

echo ""
echo -e "${GREEN}✨ System is now clean and ready for restart! ✨${NC}"
echo -e "${YELLOW}💡 To start again, run: ./start-all.sh${NC}"
