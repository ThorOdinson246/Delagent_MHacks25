# 🤖 MHacks2025 - AI Multi-Agent Scheduling Platform

A revolutionary **voice-first, autonomous AI scheduling platform** where intelligent agents negotiate optimal meeting times using real calendar data, powered by **Gemini AI** and featuring live agent negotiations.

![Platform Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![AI Powered](https://img.shields.io/badge/AI-Gemini%20Powered-blue)
![Voice Interface](https://img.shields.io/badge/Interface-Voice%20First-orange)
![Real Time](https://img.shields.io/badge/Updates-Real%20Time-red)

## 🎯 **Key Features**

- 🎤 **Voice-First Interface** - Natural speech-to-text with Cartesia STT/TTS
- 🤖 **Live Agent Negotiations** - Watch Alice, Bob (Pappu), and Charlie debate in real-time
- 🧠 **Gemini AI Integration** - Real AI-powered conversation generation and parsing
- 📅 **Smart Calendar Management** - Intelligent conflict detection and resolution  
- ⚡ **Real-Time Updates** - WebSocket-powered live updates and visualizations
- 🔄 **Conversational Flow** - Natural follow-up questions with context awareness
- 🎯 **Business Hours Logic** - Automatic time suggestions within working hours
- 📊 **Quality Scoring** - AI-driven meeting slot quality assessment

---

## 🏗️ **Project Architecture**

```
MHacks2025/
├── 🎨 frontend/                    # Next.js Frontend (Port 3002)
│   ├── app/
│   │   ├── dashboard/             # Main dashboard interface
│   │   ├── calendar/              # Calendar management
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── voice-interface.tsx    # Voice command interface
│   │   ├── agent-interaction-feed.tsx  # Live agent negotiations
│   │   ├── real-time-calendar.tsx # Calendar visualization
│   │   ├── audio-visualizer.tsx   # Voice activity visualization
│   │   └── ui/                   # Reusable UI components
│   ├── lib/
│   │   ├── voice-service.ts      # Voice command processing
│   │   ├── websocket-service.ts  # Real-time communication
│   │   ├── tts-service.ts        # Text-to-speech
│   │   └── audio-recorder-service.ts  # Speech-to-text
│   └── package.json              # Frontend dependencies
│
├── 🟢 backend/                     # Node.js API Server (Port 3001)
│   ├── app.js                    # Main server with WebSocket support
│   ├── routes/
│   │   └── api.js                # Voice command API endpoints
│   ├── services/
│   │   └── geminiService.js      # Gemini AI integration
│   └── package.json              # Backend dependencies
│
├── 🐍 backend_agents/              # Python Agent System (Port 8000)
│   ├── api.py                    # FastAPI agent coordination server
│   ├── @agent1_pappu/            # Bob's Agent (User's representative)
│   ├── @agent2_alice/            # Alice's Agent (Efficiency focused)
│   ├── @agent3_charlie/          # Charlie's Agent (Detail oriented)
│   ├── setup_database_sqlite.py  # Database initialization
│   └── requirements.txt          # Python dependencies
│
├── 📊 Database/
│   └── agentschedule.db          # SQLite database with agent schedules
│
├── 🚀 Scripts/
│   ├── start-all.sh              # Start all services
│   ├── stop-all.sh               # Stop all services
│   └── start-services.sh         # Alternative startup script
│
└── 📝 Documentation/
    └── README.md                 # This file
```

---

## ⚡ **Quick Start**

### 🎬 **One-Command Startup**
```bash
chmod +x start-all.sh
./start-all.sh
```

### 🌐 **Access the Platform**
- **Dashboard**: http://localhost:3002/dashboard
- **Calendar**: http://localhost:3002/calendar
- **API Docs**: http://localhost:8000/docs

---

## 🔧 **Manual Setup**

### 1. **Environment Setup**
```bash
# Clone and navigate to project
cd MHacks2025

# Setup Python environment
cd backend_agents
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Setup Node.js backend
cd ../backend
npm install

# Setup Frontend
cd ../frontend  
npm install
```

### 2. **Database Initialization**
```bash
cd backend_agents
python setup_database_sqlite.py
```

### 3. **Environment Variables**
Create `.env` files in each service directory:

**backend/.env:**
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

**backend_agents/.env:**
```env
DATABASE_URL=sqlite:///./agentschedule.db
PORT=8000
```

### 4. **Start Services**
```bash
# Terminal 1 - Python Agents (Port 8000)
cd backend_agents
python api.py

# Terminal 2 - Node.js Backend (Port 3001)
cd backend
npm start

# Terminal 3 - Frontend (Port 3002)
cd frontend
npm run dev
```

---

## 🎤 **Voice Interface Usage**

### **Natural Language Commands:**
- *"Schedule a team meeting tomorrow at 2 PM"*
- *"Doctor's appointment next Friday at 6 PM for 30 minutes"*
- *"Board meeting October 15th at 10 AM"*

### **Conversational Flow:**
1. **Speak your request** → System parses with Gemini AI
2. **Missing info?** → System asks clarifying questions
3. **Agents negotiate** → Watch live Alice/Bob/Charlie discussion
4. **Get results** → Hear spoken response with best time slots

---

## 🤖 **Agent Personalities**

### **🟣 Alice** - *The Efficiency Expert*
- Focuses on optimal scheduling and conflict avoidance
- Analyzes calendar patterns for best recommendations
- Prioritizes productivity and minimal disruption

### **🔵 Bob (Pappu)** - *The User Advocate*  
- Represents user preferences and requirements
- Flexible but advocates for user's stated preferences
- Collaborative negotiation style

### **🟢 Charlie** - *The Detail Analyst*
- Considers long-term scheduling implications
- Evaluates buffer times and context switching
- Provides detailed reasoning for recommendations

---

## 🛠️ **Technology Stack**

### **Frontend** 
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component library
- **Socket.io Client** - Real-time communication
- **Cartesia** - Speech-to-text and text-to-speech

### **Backend (Node.js)**
- **Express.js** - Web application framework
- **Socket.io** - WebSocket server for real-time updates
- **Google Gemini AI** - Natural language processing
- **CORS** - Cross-origin resource sharing

### **Backend (Python)**
- **FastAPI** - Modern Python API framework
- **SQLite** - Lightweight database
- **SQLAlchemy** - Database ORM
- **Pydantic** - Data validation
- **Uvicorn** - ASGI server

---

## 📊 **API Endpoints**

### **Node.js Backend (Port 3001)**
```http
POST /api/voice-command
Content-Type: application/json
{
  "transcript": "Schedule a meeting tomorrow at 2 PM",
  "action": "schedule",
  "conversationContext": {...}
}
```

### **Python Agents (Port 8000)**
```http
POST /negotiate_meeting
Content-Type: application/json
{
  "meeting_request": {
    "title": "Team Meeting",
    "preferred_date": "2025-10-01",
    "preferred_time": "14:00",
    "duration_minutes": 60
  }
}
```

---

## 🎯 **Live Demo Features**

### **Voice Interface**
- 🎤 Click to record voice commands
- 📝 Live transcript display
- 🔊 AI-generated spoken responses
- 🎵 Real-time audio visualization

### **Agent Negotiations**  
- 💬 Watch agents debate meeting conflicts
- 🧠 See reasoning behind each decision
- ⚡ Real-time message updates
- 🎯 Quality scores for time slots

### **Calendar Management**
- 📅 Multi-agent calendar views
- ⏰ Conflict detection and highlighting
- 📊 Meeting quality assessments
- 🔄 Real-time updates

---

## 🚀 **Production Deployment**

### **Environment Variables**
```bash
# Production environment
NODE_ENV=production
GEMINI_API_KEY=your_production_key
DATABASE_URL=your_production_db_url
FRONTEND_URL=https://yourdomain.com
```

### **Build Commands**
```bash
# Build frontend
cd frontend
npm run build

# Start production servers
npm run start  # Frontend
cd ../backend && npm start  # Backend
cd ../backend_agents && python api.py  # Agents
```

---

## 🧪 **Testing**

### **Voice Commands**
```bash
# Test voice endpoint
curl -X POST http://localhost:3001/api/voice-command \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Team meeting tomorrow at 2 PM", "action": "schedule"}'
```

### **Agent Negotiation**
```bash
# Test agent negotiation
curl -X POST http://localhost:8000/negotiate_meeting \
  -H "Content-Type: application/json" \
  -d '{"meeting_request": {"title": "Test", "preferred_date": "2025-10-01", "preferred_time": "14:00", "duration_minutes": 60}}'
```

---

## 🎉 **Success Metrics**

- ✅ **Real-time agent negotiations** with Gemini AI
- ✅ **Voice-first interface** with natural language processing
- ✅ **Intelligent conflict resolution** based on calendar data
- ✅ **Conversational follow-up** with context awareness
- ✅ **Business hours enforcement** with alternative suggestions
- ✅ **Quality scoring system** for optimal meeting times
- ✅ **WebSocket real-time updates** across all components
- ✅ **Production-ready architecture** with proper error handling

---

## 🏆 **Recognition**

Built for **MHacks 2025** - showcasing the future of AI-powered scheduling with:
- **Revolutionary voice interface** 
- **Real multi-agent negotiations**
- **Advanced AI integration**
- **Production-ready deployment**

---

## 📞 **Support & Contact**

For questions, issues, or demo requests:
- 🐛 **Issues**: Create a GitHub issue
- 💬 **Discussions**: Use GitHub Discussions
- 📧 **Email**: Contact the development team

---

**🚀 This is the future of AI-powered meeting scheduling - where agents think, negotiate, and decide just like humans!** ✨