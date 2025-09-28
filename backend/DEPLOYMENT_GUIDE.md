# Backend Deployment & Run Guide

## Quick Start

### 1. Dependencies Installation
```bash
cd backend
npm install
```

### 2. Environment Setup
Copy the `.env.example` file to `.env` and update with your configuration:
```bash
cp .env.example .env
```

Edit `.env` with your preferred values:
```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your_gemini_api_key_here"
CARTESIA_API_KEY="your_cartesia_api_key_here" 
CARTESIA_BASE_URL="https://api.cartesia.ai"
DEFAULT_VOICE_ID="a0e99841-438c-4a64-b679-ae26e5e21b1e"
PORT="3002"
NODE_ENV="development"
LOG_LEVEL="info"
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your_jwt_secret_here"
```

### 3. Database Setup
Initialize and seed the database:
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed with sample data (optional)
npm run seed
```

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3002` (or the port specified in `.env`).

## API Endpoints

### Health & Status
- `GET /api/health` - Server health check

### Agents Management
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get specific agent
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent

### Meetings Management
- `GET /api/meetings` - List all meetings
- `GET /api/meetings/:id` - Get specific meeting
- `POST /api/meetings` - Create new meeting
- `PUT /api/meetings/:id` - Update meeting
- `DELETE /api/meetings/:id` - Delete meeting

### Calendar Management
- `GET /api/calendar` - List calendar blocks (supports ?userId, ?start, ?end filters)
- `GET /api/calendar/:userId` - Get user's calendar
- `POST /api/calendar` - Create calendar block
- `POST /api/calendar/:userId/availability` - Check availability

### Voice Processing
- `POST /api/voice/process` - Process voice input and extract meeting details
- `POST /api/voice/extract` - Alternative endpoint for voice extraction
- `POST /api/voice/to-meeting` - Convert voice input directly to meeting

### Negotiation & Scheduling
- `POST /api/negotiate` - Start negotiation for meeting scheduling
- `POST /api/negotiate/start` - Alternative negotiation endpoint
- `GET /api/negotiate/:id/status` - Get negotiation status
- `POST /api/negotiate/:id/respond` - Respond to negotiation

## Testing

Run the comprehensive API test suite:
```bash
./test_api.sh
```

Or test individual endpoints manually:
```bash
# Health check
curl http://localhost:3002/api/health

# List agents
curl http://localhost:3002/api/agents

# Process voice input
curl -X POST -H "Content-Type: application/json" \\
  -d '{"transcript": "Schedule a meeting tomorrow at 2 PM", "user_id": "user_123"}' \\
  http://localhost:3002/api/voice/process
```

## Configuration Options

### Mock Mode (No API Keys)
The backend runs in "mock mode" when API keys are not configured:
- Gemini responses return pattern-matched extraction results
- TTS returns success without generating actual audio
- All endpoints remain functional for development/testing

### Production Mode
For production deployment:
1. Set `NODE_ENV=production`
2. Configure real API keys for Gemini and Cartesia
3. Use a production database (PostgreSQL recommended)
4. Set up proper logging and monitoring
5. Configure CORS for your production frontend URL

## Database Schema

The backend uses Prisma ORM with the following main models:
- **User** - System users
- **Agent** - AI scheduling agents
- **Meeting** - Meeting requests and scheduled meetings
- **MeetingParticipant** - Meeting participants
- **CalendarBlock** - Calendar availability blocks
- **VoiceInteraction** - Voice processing sessions
- **NegotiationLog** - Agent negotiation history

## WebSocket Support

Real-time features via Socket.IO:
- Join negotiation rooms: `socket.emit('join-negotiation', negotiationId)`
- Receive real-time updates during agent negotiations
- Live status updates for meeting scheduling

## Logging

Logs are written to:
- Console (development)
- `logs/app.log` (combined logs)
- `logs/error.log` (error logs only)

Log levels: `error`, `warn`, `info`, `debug`

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the PORT in `.env` file
2. **Database connection failed**: Check DATABASE_URL and run `npx prisma migrate deploy`
3. **API key errors**: Check API keys in `.env` file (can run without them in mock mode)
4. **CORS errors**: Update FRONTEND_URL in `.env` to match your frontend URL

### Debug Mode
Set `LOG_LEVEL=debug` in `.env` for detailed logging.

## Performance Considerations

- Database queries are optimized with appropriate indexes
- API responses include pagination where needed
- WebSocket connections are managed efficiently
- Caching can be added for frequently accessed data

For production deployments, consider:
- Database connection pooling
- Redis for session management
- Load balancing for multiple instances
- CDN for static assets
