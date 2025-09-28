import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { createServer } from 'http';
import { Server } from 'socket.io';
import apiRoutes from './routes/api.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json()); // for parsing application/json

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api', apiRoutes);

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
    
    // Join a room for real-time updates
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`Client ${socket.id} joined room: ${room}`);
    });
});

// Root route
app.get('/', (req, res) => {
    res.send('AGENTSCHEDULE Backend Orchestrator is running!');
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});

