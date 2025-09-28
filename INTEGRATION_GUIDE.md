# Agent Orchestration Integration Guide

This guide explains how to run the integrated agent orchestration system with proper communication flow: **Frontend → Express Backend → Python Agent API → Express Backend → Frontend**.

## Architecture Overview

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Frontend  │◄──►│ Express API  │◄──►│ Python API  │
│  (Next.js)  │    │   (Node.js)  │    │ (FastAPI)   │
│  Port 3000  │    │  Port 3001   │    │ Port 8000   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │
       │                   │
   WebSocket           WebSocket
   Real-time           Real-time
   Updates             Updates
```

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.8 or higher)
3. **Git**

## Setup Instructions

### 1. Install Dependencies

#### Backend (Express)
```bash
cd backend
npm install
```

#### Frontend (Next.js)
```bash
cd frontend
npm install
```

#### Python Agent API
```bash
cd backend_agents
pip install -r requirements.txt  # If requirements.txt exists
# Or install manually: pip install fastapi uvicorn sqlite3
```

### 2. Environment Configuration

#### Express Backend (.env file in backend/)
```env
GEMINI_API_KEY=your_secure_gemini_api_key_here
PORT=3001
```

#### Python Backend
- Ensure the database file `agentschedule.db` exists in the root directory
- The Python API will run on port 8000 by default

### 3. Running the Services

#### Terminal 1: Python Agent API
```bash
cd backend_agents
python api.py
```
Expected output:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

#### Terminal 2: Express Backend
```bash
cd backend
npm start
```
Expected output:
```
Server is running on http://localhost:3001
WebSocket server is running on ws://localhost:3001
```

#### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```
Expected output:
```
- ready started server on 0.0.0.0:3000
- info Loaded env from .env.local
```

## Testing the Integration

### 1. Health Checks

- **Python API**: http://localhost:8000/health
- **Express API**: http://localhost:3001/api/health
- **Frontend**: http://localhost:3000

### 2. Voice Workflow Test

1. Open http://localhost:3000 in your browser
2. Click "Start Recording" in the voice interface
3. Say: "Schedule a marketing meeting for tomorrow at 2 PM for 60 minutes"
4. The system should:
   - Transcribe your speech
   - Send to Express backend
   - Express backend calls Gemini to extract meeting details
   - Express backend calls Python API for negotiation
   - Python API returns available slots
   - Express backend generates spoken response
   - Frontend receives response and speaks it back to you
   - WebSocket provides real-time updates

### 3. API Endpoints

#### Express Backend (Port 3001)
- `GET /api/health` - Health check
- `GET /api/meetings` - Get all meetings
- `GET /api/calendar/:userId` - Get user calendar
- `POST /api/negotiate` - Find available meeting slots
- `POST /api/schedule` - Schedule a meeting
- `POST /api/voice-command` - Process voice commands

#### Python Backend (Port 8000)
- `GET /health` - Health check
- `GET /meetings` - Get all meetings
- `GET /calendar/{user_id}` - Get user calendar
- `POST /negotiate` - Find available meeting slots
- `POST /schedule` - Schedule a meeting
- `WS /ws` - WebSocket for real-time updates

## Features

### ✅ Implemented
- **Voice Recognition**: Speech-to-text using browser APIs
- **Natural Language Processing**: Gemini AI for intent extraction
- **Agent Negotiation**: Python backend with AI agent communication
- **Real-time Updates**: WebSocket communication
- **Text-to-Speech**: Browser TTS for spoken responses
- **Calendar Integration**: Database-driven calendar management
- **Error Handling**: Comprehensive error handling and fallbacks

### 🔄 Workflow
1. **Voice Input** → Frontend captures audio
2. **Transcription** → Audio converted to text
3. **Intent Extraction** → Gemini extracts meeting details
4. **Agent Negotiation** → Python backend finds available slots
5. **Response Generation** → Gemini creates natural response
6. **Text-to-Speech** → Response spoken back to user
7. **Real-time Updates** → WebSocket provides live updates

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Ensure ports 3000, 3001, and 8000 are available
   - Check if other services are using these ports

2. **CORS Errors**
   - Verify CORS configuration in Express backend
   - Check that frontend is running on localhost:3000

3. **Python API Connection**
   - Ensure Python API is running on port 8000
   - Check database file exists and is accessible

4. **Gemini API Key**
   - Verify GEMINI_API_KEY is set in backend/.env
   - Get API key from https://ai.google.dev/

5. **WebSocket Connection**
   - Check browser console for WebSocket errors
   - Verify Socket.IO is properly installed

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
NODE_ENV=development
```

## Development Notes

- The system uses mock data when Python backend is unavailable
- WebSocket provides real-time updates for better UX
- TTS uses browser's built-in speech synthesis
- Voice recognition works in Chrome, Edge, and Safari
- All services include comprehensive error handling

## Next Steps

1. **Production Deployment**: Configure for production environment
2. **Database Migration**: Set up proper database management
3. **Authentication**: Add user authentication and authorization
4. **Advanced Features**: Add more meeting types and scheduling options
5. **Mobile Support**: Optimize for mobile devices
