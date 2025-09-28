# tMHacks2025
# MHacks2025 - AI Voice Meeting Scheduler

A sophisticated voice-first meeting scheduling system with AI-powered negotiation.

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
npm install
npm start
# Server runs on http://localhost:4000 (Gemini API key already configured)
```

### 2. Frontend Setup  
```bash
cd frontend
npm install

npm run dev
# Frontend runs on http://localhost:3000
```

### 3. Test Integration
```bash
# Test backend health
curl http://localhost:4000/api/health

# Test voice command
curl -X POST http://localhost:4000/api/voice-command \
  -H "Content-Type: application/json" \
  -d '{"transcript":"schedule a meeting for tomorrow at 2pm","action":"schedule"}'
```

## 🎯 Architecture

```
Frontend (Next.js :3000)     Backend (Express :4000)     AI Services
├── Voice Interface      ↔   ├── Voice Orchestrator   ↔  ├── Gemini AI
├── Meeting Dashboard    ↔   ├── API Routes          ↔  └── Cartesia TTS  
├── STT/TTS Services     ↔   └── Mock Data Store
└── Agent Management
```

## 🔧 Features

### ✅ Working
- **Voice Recording & Transcription** - Real-time speech-to-text
- **AI Intent Extraction** - Gemini-powered meeting detail parsing  
- **Natural Language Response** - AI-generated spoken confirmations
- **Meeting Dashboard** - View and manage scheduled meetings
- **Agent Status** - Monitor AI negotiation progress
- **Text-to-Speech** - Cartesia-powered voice synthesis

### 🚧 Mock Data (Development)
- Meeting negotiation (simulated Python backend)
- Calendar availability checks  
- Multi-agent scheduling scenarios

## 🛠️ Development

### API Keys
All API keys are pre-configured for demo:
- Gemini AI key (backend/.env) 
- Cartesia TTS key (hardcoded in frontend)

## 🔒 Security Notes

- API keys are hardcoded for demo purposes
- CORS configured for localhost development
- For production: move keys to environment variables

## 📊 Integration Status: 95/100

**✅ Fixed Issues:**
- Port configuration alignment (:3000 ↔ :4000)
- API endpoint compatibility (FastAPI → Express)  
- Voice workflow integration (Gemini orchestrator)
- Environment variable management
- Error handling & validation
