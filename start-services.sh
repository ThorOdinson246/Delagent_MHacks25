#!/bin/bash

# Agent Orchestration Startup Script
# This script starts all required services for the integrated system

echo "🚀 Starting Agent Orchestration System..."
echo "=========================================="

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Port $1 is already in use"
        return 1
    else
        echo "✅ Port $1 is available"
        return 0
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    echo "⏳ Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        
        echo "   Attempt $attempt/$max_attempts - waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start within expected time"
    return 1
}

# Check if required ports are available
echo "🔍 Checking port availability..."
check_port 8000 || exit 1
check_port 3001 || exit 1
check_port 3000 || exit 1

# Start Python Agent API
echo ""
echo "🐍 Starting Python Agent API (Port 8000)..."
cd backend_agents
python api.py &
PYTHON_PID=$!
cd ..

# Wait for Python API to be ready
wait_for_service "http://localhost:8000/health" "Python Agent API" || {
    echo "❌ Failed to start Python Agent API"
    kill $PYTHON_PID 2>/dev/null
    exit 1
}

# Start Express Backend
echo ""
echo "🟢 Starting Express Backend (Port 3001)..."
cd backend
npm start &
EXPRESS_PID=$!
cd ..

# Wait for Express Backend to be ready
wait_for_service "http://localhost:3001/api/health" "Express Backend" || {
    echo "❌ Failed to start Express Backend"
    kill $PYTHON_PID $EXPRESS_PID 2>/dev/null
    exit 1
}

# Start Frontend
echo ""
echo "⚛️  Starting Frontend (Port 3000)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for Frontend to be ready
wait_for_service "http://localhost:3000" "Frontend" || {
    echo "❌ Failed to start Frontend"
    kill $PYTHON_PID $EXPRESS_PID $FRONTEND_PID 2>/dev/null
    exit 1
}

echo ""
echo "🎉 All services started successfully!"
echo "=========================================="
echo "📱 Frontend:     http://localhost:3000"
echo "🔗 Express API:  http://localhost:3001"
echo "🐍 Python API:   http://localhost:8000"
echo ""
echo "🔧 Process IDs:"
echo "   Python API:   $PYTHON_PID"
echo "   Express API:  $EXPRESS_PID"
echo "   Frontend:     $FRONTEND_PID"
echo ""
echo "🛑 To stop all services, run: kill $PYTHON_PID $EXPRESS_PID $FRONTEND_PID"
echo ""
echo "📖 For detailed instructions, see INTEGRATION_GUIDE.md"
echo ""
echo "🎤 Try saying: 'Schedule a marketing meeting for tomorrow at 2 PM for 60 minutes'"

# Keep script running and show logs
echo ""
echo "📋 Service Logs (Press Ctrl+C to stop all services):"
echo "=================================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $PYTHON_PID $EXPRESS_PID $FRONTEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for any process to exit
wait
