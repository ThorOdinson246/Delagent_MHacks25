# Frontend-Backend Integration Guide

## Overview

This guide explains how to integrate the frontend with the backend API for the voice-first meeting scheduler.

## Backend Configuration

The backend is configured to run on port **3002** and provides the following base URL:
```
http://localhost:3002/api
```

## Frontend Configuration

### Environment Setup

Update your frontend `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_CARTESIA_API_KEY=your_cartesia_api_key_here
```

### API Client Configuration

The frontend API client is configured in `frontend/lib/api.ts` with the correct base URL.

## Key Integration Points

### 1. Voice Processing Flow

**Frontend → Backend Flow:**
```typescript
// Frontend: components/voice-interface.tsx
const processVoice = async (transcript: string) => {
  const response = await fetch(`${API_BASE_URL}/api/voice/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      user_id: currentUserId,
      session_id: sessionId
    })
  });
  
  const result = await response.json();
  // Handle extraction result
};
```

**Backend Response:**
```json
{
  "success": true,
  "interaction_id": "cmg123...",
  "extracted_data": {
    "title": "Team Meeting",
    "preferred_date": "2025-09-30",
    "preferred_time": "14:00",
    "duration_minutes": 60,
    "participants": [],
    "meeting_type": "meeting",
    "priority": "medium"
  },
  "confidence_score": 0.7,
  "reasoning": "Extracted meeting details from voice input",
  "processing_time_ms": 245,
  "timestamp": "2025-09-28T02:34:39.436Z"
}
```

### 2. Meeting Creation Flow

**Frontend:**
```typescript
const createMeeting = async (meetingData: MeetingRequest) => {
  const response = await fetch(`${API_BASE_URL}/api/meetings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: meetingData.title,
      description: meetingData.description,
      organizerId: currentUserId,
      preferredStartTime: `${meetingData.preferred_date}T${meetingData.preferred_time}:00.000Z`,
      preferredEndTime: calculateEndTime(meetingData),
      durationMinutes: meetingData.duration_minutes,
      participants: meetingData.participants || [],
      priority: mapPriorityToNumber(meetingData.priority)
    })
  });
  
  return await response.json();
};
```

### 3. Negotiation Flow

**Start Negotiation:**
```typescript
const startNegotiation = async (meetingRequest: MeetingRequest) => {
  const response = await fetch(`${API_BASE_URL}/api/negotiate/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meeting_request: meetingRequest })
  });
  
  const result = await response.json();
  
  // Connect to WebSocket for real-time updates
  socket.emit('join-negotiation', result.negotiation_id);
  
  return result;
};
```

**Backend Response:**
```json
{
  "success": true,
  "meeting_request": { /* original request */ },
  "available_slots": [
    {
      "start_time": "2025-09-30T14:00:00.000Z",
      "end_time": "2025-09-30T15:00:00.000Z",
      "quality_score": 0.8,
      "day_of_week": "tuesday",
      "date_formatted": "September 30th, 2025",
      "time_formatted": "2:00 PM"
    }
  ],
  "selected_slot": { /* best slot */ },
  "negotiation_id": "neg_1759026879523",
  "status": "in_progress"
}
```

### 4. WebSocket Integration

**Frontend Setup:**
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3002');

// Join negotiation room
socket.emit('join-negotiation', negotiationId);

// Listen for updates
socket.on('negotiation-update', (update) => {
  // Handle real-time negotiation updates
  console.log('Negotiation update:', update);
});

// Listen for final decision
socket.on('meeting-scheduled', (meeting) => {
  // Handle successful scheduling
  console.log('Meeting scheduled:', meeting);
});
```

### 5. Agent Status Monitoring

**Get All Agents:**
```typescript
const getAgents = async () => {
  const response = await fetch(`${API_BASE_URL}/api/agents`);
  return await response.json();
};
```

**Response Format:**
```json
{
  "success": true,
  "agents": [
    {
      "id": "agent_123",
      "name": "Alice's Assistant",
      "personality": "Professional and punctual",
      "status": "IDLE", // IDLE, BUSY, NEGOTIATING
      "flexibility": 6,
      "priority": ["punctuality", "preparation_time"],
      "user": {
        "name": "Alice Johnson",
        "email": "alice@example.com"
      }
    }
  ]
}
```

### 6. Calendar Integration

**Get Calendar Data:**
```typescript
const getCalendar = async (userId?: string, startDate?: string, endDate?: string) => {
  let url = `${API_BASE_URL}/api/calendar`;
  const params = new URLSearchParams();
  
  if (userId) params.append('userId', userId);
  if (startDate) params.append('start', startDate);
  if (endDate) params.append('end', endDate);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url);
  return await response.json();
};
```

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2025-09-28T02:34:39.436Z"
}
```

### Frontend Error Handling
```typescript
const apiCall = async () => {
  try {
    const response = await fetch(apiUrl);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API call failed');
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error);
    // Handle error appropriately
    throw error;
  }
};
```

## Authentication (Future Enhancement)

When authentication is implemented:

```typescript
// Include JWT token in requests
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
};
```

## Testing Integration

### Mock Mode
When API keys are not configured, the backend runs in mock mode:
- Voice extraction returns pattern-matched results
- AI agents provide simple responses
- All endpoints remain functional for development

### Full Integration Testing
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Test voice input → extraction → negotiation → scheduling flow
4. Verify real-time updates via WebSocket
5. Check agent status changes during negotiations

## Performance Optimization

### Frontend Optimizations
- Debounce voice input processing
- Cache agent and calendar data
- Use WebSocket for real-time features only when needed
- Implement proper loading states

### Backend Optimizations
- Database query optimization
- Response caching for frequently accessed data
- Connection pooling
- Rate limiting for API endpoints

## Production Deployment

### Backend
- Set production environment variables
- Configure production database
- Set up SSL/HTTPS
- Configure CORS for production domain
- Set up monitoring and logging

### Frontend
- Update `NEXT_PUBLIC_API_URL` to production backend URL
- Configure production build optimizations
- Set up CDN for static assets
- Configure proper error boundary handling

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check FRONTEND_URL in backend .env
2. **Connection Refused**: Ensure backend is running on correct port
3. **WebSocket Issues**: Check firewall and proxy settings
4. **API Key Errors**: Backend runs in mock mode without keys
5. **Database Errors**: Check database connection and migrations

### Debug Tools
- Browser Network tab for API requests
- Backend logs in `backend/logs/`
- WebSocket connection in browser dev tools
- Database inspection with Prisma Studio: `npx prisma studio`
