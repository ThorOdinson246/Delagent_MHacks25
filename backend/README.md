# Multi-Agent Meeting Scheduler Backend

A Node.js backend that powers an AI-driven meeting scheduling system with autonomous agent negotiation.

## System Architecture

### Core Components
1. **Voice Processing Layer** - Handles STT input and extracts meeting details via Gemini
2. **Agent System** - Autonomous agents representing each user with unique personalities
3. **Negotiation Engine** - Manages multi-agent discussions and conflict resolution
4. **Calendar Management** - Handles availability and scheduling conflicts
5. **TTS Response Layer** - Provides seamless voice feedback to users

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google Gemini API for NLP and agent reasoning
- **Voice**: Cartesia for TTS responses
- **WebSockets**: Real-time agent negotiation updates

## Features
- 🎤 Voice-first meeting requests with automatic information extraction
- 🤖 Autonomous agent negotiation with personality-based decision making
- 📅 Intelligent conflict detection and resolution
- 🔄 Real-time negotiation progress tracking
- 🗣️ Seamless TTS feedback for user interactions
- 📊 Detailed negotiation logs and reasoning transparency

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Google Gemini API key
- Cartesia API key

### Installation
```bash
npm install
cp .env.example .env
# Configure your environment variables
npm run db:migrate
npm run dev
```

### Environment Variables
```env
DATABASE_URL="postgresql://username:password@localhost:5432/meeting_scheduler"
GEMINI_API_KEY="your_gemini_api_key"
CARTESIA_API_KEY="your_cartesia_api_key"
PORT=8000
NODE_ENV=development
```
