import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json()); // for parsing application/json

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('AGENTSCHEDULE Backend Orchestrator is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

