import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import routes
import healthRoutes from './routes/health';
import meetingRoutes from './routes/meetings';
import calendarRoutes from './routes/calendar';
import negotiationRoutes from './routes/negotiation';
import agentRoutes from './routes/agents';
import voiceRoutes from './routes/voice';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// Import services
import { NegotiationService } from './services/negotiationService';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/negotiate', negotiationRoutes);
app.use('/api/schedule', negotiationRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/voice', voiceRoutes);

// Error handling
app.use(errorHandler);

// Initialize negotiation service with socket.io
const negotiationService = new NegotiationService(prisma, io);

// Make services available globally
declare global {
  var prisma: PrismaClient;
  var io: Server;
  var negotiationService: NegotiationService;
}

global.prisma = prisma;
global.io = io;
global.negotiationService = negotiationService;

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-negotiation', (negotiationId: string) => {
    socket.join(`negotiation-${negotiationId}`);
    logger.info(`Client ${socket.id} joined negotiation ${negotiationId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Start server
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
