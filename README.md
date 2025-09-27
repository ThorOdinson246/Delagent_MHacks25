# Multi-Agent AI Scheduling Platform

A voice-first, autonomous AI scheduling platform where agents negotiate optimal meeting times based on real calendar data.

## 🏗️ **Project Structure**

```
MHacks2025/
├── @agent1_pappu/              # Bob's Agent (Collaborative)
│   ├── scheduling_agent.py     # Main agent script
│   ├── run_agent.py           # Agent runner
│   ├── decision_engine.py     # Scheduling logic
│   ├── agent_personalities.py # Negotiation styles
│   ├── negotiation_protocol.py # Agent communication
│   ├── models.py              # Data models
│   ├── config.py              # Configuration
│   ├── requirements.txt       # Dependencies
│   └── env_template.txt       # Environment template
├── @agent2_alice/              # Alice's Agent (Focused)
│   ├── alice_agent.py         # Main agent script
│   ├── decision_engine.py     # Scheduling logic
│   ├── database.py            # Database operations
│   ├── models.py              # Data models
│   ├── config.py              # Configuration
│   └── requirements.txt       # Dependencies
├── persistent_negotiation.py   # Main negotiation system
├── setup_database_sqlite.py   # Database setup
├── agentschedule.db           # SQLite database
├── README_AGENTS.md           # Detailed documentation
└── README.md                  # This file
```

## 🚀 **Quick Start**

### 1. Setup Database
```bash
python setup_database_sqlite.py
```

### 2. Start Both Agents
```bash
# Terminal 1 - Bob's Agent
cd @agent1_pappu
python run_agent.py

# Terminal 2 - Alice's Agent  
cd @agent2_alice
python alice_agent.py
```

### 3. Run Negotiation
```bash
# Terminal 3 - Run negotiation
python persistent_negotiation.py
```

## 🎯 **Key Features**

- ✅ **Real Agent Communication** - Agents actually send messages to each other
- ✅ **Database Persistence** - Meetings are scheduled and remembered
- ✅ **Multi-day Exploration** - Agents check multiple days for availability
- ✅ **Continuous Negotiation** - Keeps trying until success or real failure
- ✅ **No Hardcoded Values** - All decisions based on real calendar data
- ✅ **Human-like Logic** - Works like actual humans scheduling meetings

## 🧪 **How It Works**

1. **Bob requests a meeting** at a random time
2. **Alice checks her database** for conflicts
3. **If conflicts exist**, Alice proposes alternative times
4. **Bob checks his database** for the proposed time
5. **Process repeats** until a time is found or negotiation fails
6. **Meeting is scheduled** in the database with calendar blocks
7. **Next run remembers** previously scheduled meetings

## 📊 **Database Schema**

- **users** - Agent information
- **calendar_blocks** - Schedule data for each user
- **meeting_requests** - Meeting requests and status
- **meeting_participants** - Meeting participants
- **negotiation_sessions** - Negotiation history
- **negotiation_messages** - Message logs

## 🔧 **Configuration**

Each agent has its own configuration:
- **Bob**: Collaborative personality, flexible scheduling
- **Alice**: Focused personality, protects focus time

## 📝 **Environment Setup**

Copy `@agent1_pappu/env_template.txt` to `@agent1_pappu/.env` and configure:
```
AGENT_SEED="your_unique_seed_phrase"
AGENT_NAME="YourAgentName"
AGENT_DESCRIPTION="Your agent description"
```

## 🎉 **Success Criteria**

- ✅ Agents negotiate based on real schedules
- ✅ Database is updated with scheduled meetings
- ✅ Different results on each run
- ✅ Real conflict detection and resolution
- ✅ Human-like negotiation behavior

## 📚 **Documentation**

See `README_AGENTS.md` for detailed technical documentation.

---

**This is a real multi-agent AI scheduling system that works exactly like humans!** 🚀