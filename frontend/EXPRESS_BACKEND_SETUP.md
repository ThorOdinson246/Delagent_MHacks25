# Express Backend Setup for AGENTSCHEDULE

## Overview
Your FastAPI backend is already complete. However, if you want to create an Express.js version, here's the setup guide.

## Required Dependencies

\`\`\`bash
npm init -y
npm install express cors helmet morgan dotenv
npm install -D @types/express @types/cors @types/morgan typescript ts-node nodemon
\`\`\`

## Environment Variables (.env)
\`\`\`env
PORT=8000
DATABASE_URL=postgresql://username:password@localhost:5432/agentschedule
NODE_ENV=development
\`\`\`

## Basic Express Server Structure

\`\`\`javascript
// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    message: "Agent Negotiation API",
    version: "1.0.0",
    endpoints: {
      "POST /negotiate": "Find available meeting slots",
      "POST /schedule": "Schedule a specific meeting slot",
      "GET /meetings": "Get all meetings from database",
      "GET /calendar/:userId": "Get calendar for user (bob/alice)",
      "GET /health": "Health check"
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database_connected: true, // Add actual DB check
    timestamp: new Date().toISOString()
  });
});

// Add your API routes here following the FastAPI structure

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
\`\`\`

## API Endpoints to Implement
Based on your FastAPI backend, implement these Express routes:

1. **GET /health** - Health check
2. **GET /meetings** - Get all meetings
3. **GET /calendar/:userId** - Get user calendar (bob/alice)
4. **POST /negotiate** - Find available meeting slots
5. **POST /schedule** - Schedule a meeting

## Database Integration
Use your existing PostgreSQL database with a library like `pg` or `prisma`:

\`\`\`bash
npm install pg
npm install -D @types/pg
\`\`\`

## Frontend Configuration
Update your frontend's API base URL:

\`\`\`typescript
// In lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
\`\`\`

## CORS Configuration
Make sure your Express server allows requests from your frontend:

\`\`\`javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
