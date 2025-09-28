# 🚀 MHacks2025 AI Agent Meeting System - Quick Start

## 🎯 **One-Command Startup**

```bash
./start-all.sh
```

This will automatically:
- ✅ Start Python Agents Backend (Port 8000)
- ✅ Start Node.js Backend (Port 3001)  
- ✅ Start Frontend (Port 3002)
- ✅ Open dashboard at: **http://localhost:3002**

## 🛑 **Stop All Services**

```bash
./stop-all.sh
```

## 🎭 **What You Get**

### **🤖 3 AI Agents**
- **Alice's Agent**: Focus-Protective (Flexibility: 3/10)
- **Pappu's Agent**: Collaborative (Flexibility: 8/10)
- **Charlie's Agent**: Strategic (Flexibility: 6/10)

### **🎤 Voice Features**
- **Cartesia STT**: High-quality speech-to-text
- **Cartesia TTS**: Professional AI voice responses
- **Real-time processing**: Instant voice commands

### **🧠 Live Agent Thinking**
- **Real-time visualization** of agent reasoning
- **Conflict detection**: See when agents disagree
- **Agreement tracking**: Watch consensus building
- **Confidence scores**: Live percentage updates

### **📅 Smart Scheduling**
- **3-agent negotiation** for optimal meeting times
- **Calendar conflict resolution**
- **Dynamic time suggestions**
- **WebSocket real-time updates**

## 🌐 **URLs**

- **Main App**: http://localhost:3002 (redirects to dashboard)
- **Dashboard**: http://localhost:3002/dashboard
- **Python API**: http://localhost:8000
- **Node.js API**: http://localhost:3001

## 🎮 **How to Demo**

1. **Start the system**: `./start-all.sh`
2. **Open browser**: http://localhost:3002
3. **Click the microphone** in the voice interface
4. **Say**: "Schedule a team meeting tomorrow at 10am"
5. **Watch the magic**:
   - 🎤 Voice converts to text
   - 🧠 Agents start thinking (live updates)
   - ⚡ Conflicts and agreements appear
   - 🔊 Beautiful Cartesia voice responds
   - 📅 Meeting gets scheduled

## 🔧 **Troubleshooting**

### Port Issues
```bash
# Check what's running
lsof -i :8000 -i :3001 -i :3002

# Kill specific port
sudo kill -9 $(lsof -ti:8000)
```

### Service Status
```bash
# Check processes
ps aux | grep -E "(python.*api|node.*app|npm.*dev)"
```

### Fresh Start
```bash
./stop-all.sh
sleep 3
./start-all.sh
```

## 🎉 **Demo Script**

**"Hey everyone, let me show you the most advanced multi-agent meeting system!"**

1. **Voice Command**: "Set up a team meeting tomorrow at 9am"
2. **Point out**: "Watch Alice, Pappu, and Charlie thinking in real-time"
3. **Highlight**: "See the conflicts - Alice protects her focus time!"
4. **Show**: "Pappu mediates, Charlie optimizes efficiency"
5. **Listen**: "Beautiful Cartesia voice responds"
6. **Result**: "Perfect meeting time found through AI negotiation!"

---

**✨ Built for MHacks2025 - The Future of AI-Powered Scheduling ✨**
