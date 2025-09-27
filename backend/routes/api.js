import express from 'express';
import { extractMeetingIntent, generateSpokenResponse } from '../services/geminiService.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database_connected: true, // Mock for now
        timestamp: new Date().toISOString()
    });
});

// Get all meetings endpoint (mock data)
router.get('/meetings', (req, res) => {
    res.json({
        success: true,
        meetings: [
            {
                id: "1",
                title: "Marketing Sync",
                duration_minutes: 60,
                preferred_start_time: "2025-09-28T14:00:00Z",
                preferred_end_time: "2025-09-28T15:00:00Z", 
                status: "negotiating",
                created_at: "2025-09-27T10:00:00Z"
            }
        ],
        total_meetings: 1,
        timestamp: new Date().toISOString()
    });
});

// Get user calendar endpoint (mock data)
router.get('/calendar/:userId', (req, res) => {
    const { userId } = req.params;
    res.json({
        success: true,
        user_id: userId,
        calendar_blocks: [
            {
                id: "1",
                user_id: userId,
                title: "Existing Meeting",
                start_time: "2025-09-28T10:00:00Z",
                end_time: "2025-09-28T11:00:00Z",
                block_type: "meeting",
                priority_level: 3,
                is_flexible: false,
                created_at: "2025-09-27T10:00:00Z"
            }
        ],
        total_blocks: 1,
        timestamp: new Date().toISOString()
    });
});

// Negotiate meeting endpoint 
router.post('/negotiate', async (req, res) => {
    const meetingRequest = req.body;
    
    // Mock negotiation result - in real app this would call Python backend
    res.json({
        success: true,
        meeting_request: meetingRequest,
        available_slots: [
            {
                start_time: "2025-09-29T14:00:00",
                end_time: "2025-09-29T15:00:00", 
                duration_minutes: meetingRequest.duration_minutes,
                quality_score: 115,
                day_of_week: "Monday",
                date_formatted: "2025-09-29",
                time_formatted: "14:00"
            }
        ],
        total_slots_found: 1,
        search_window: {
            start: "2025-09-25T18:00:00",
            end: "2025-10-05T18:00:00"
        },
        selected_slot: null,
        meeting_id: null,
        message: "Found 1 available time slots",
        timestamp: new Date().toISOString()
    });
});

// Schedule meeting endpoint
router.post('/schedule', async (req, res) => {
    const meetingRequest = req.body;
    const slotIndex = req.query.slot_index || 0;
    
    // Mock successful scheduling
    res.json({
        success: true,
        meeting_request: meetingRequest,
        available_slots: [],
        total_slots_found: 0,
        selected_slot: {
            start_time: "2025-09-29T14:00:00",
            end_time: "2025-09-29T15:00:00",
            duration_minutes: meetingRequest.duration_minutes,
            quality_score: 115,
            day_of_week: "Monday", 
            date_formatted: "2025-09-29",
            time_formatted: "14:00"
        },
        meeting_id: "scheduled_" + Date.now(),
        message: "Meeting successfully scheduled",
        timestamp: new Date().toISOString()
    });
});

// Middleware to validate API configuration
const validateConfig = (req, res, next) => {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_secure_gemini_api_key_here") {
        return res.status(503).json({ 
            error: 'Server configuration error: Gemini API key not configured',
            hint: 'Administrator: Please set GEMINI_API_KEY in .env file'
        });
    }
    next();
};

// Main endpoint to handle the voice command processing flow
router.post('/voice-command', validateConfig, async (req, res) => {
    const { transcript, action, context } = req.body;

    if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required.' });
    }

    try {
        if (action === 'schedule') {
            // Step 1: Extract meeting details from the initial command
            console.log(`[Node Backend] Step 1: Received transcript: "${transcript}"`);
            const meetingDetailsJSON = await extractMeetingIntent(transcript);
            console.log('[Node Backend] Step 2: Extracted meeting details from transcript:', meetingDetailsJSON);
            
            // --- PYTHON BACKEND CALL (SIMULATED) ---
            // In a real application, you would make an HTTP POST request to your Python server here
            // using the 'meetingDetailsJSON' as the payload.
            console.log('[Node Backend] Step 3: Sending extracted details to Python backend...');
            // const pythonResponse = await fetch('http://your-python-backend-url/negotiate', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(meetingDetailsJSON)
            // });
            // const pythonResult = await pythonResponse.json();

            // For now, we'll use a realistic mock response that matches your Python server's output
            const pythonResult = {
                "success": true,
                "meeting_request": {
                    "title": meetingDetailsJSON.title,
                    "preferred_date": meetingDetailsJSON.preferred_date,
                    "preferred_time": meetingDetailsJSON.preferred_time,
                    "duration_minutes": meetingDetailsJSON.duration_minutes,
                    "is_ai_agent_meeting": true
                },
                "available_slots": [
                    {
                        "start_time": "2025-09-29T14:00:00",
                        "end_time": "2025-09-29T15:00:00",
                        "duration_minutes": 60,
                        "quality_score": 115,
                        "day_of_week": "Monday",
                        "date_formatted": "2025-09-29",
                        "time_formatted": "14:00"
                    }
                ],
                "total_slots_found": 1,
                "search_window": {
                    "start": "2025-09-25T18:00:00",
                    "end": "2025-10-05T18:00:00"
                },
                "selected_slot": null,
                "meeting_id": null,
                "message": "Found 1 available time slots",
                "timestamp": new Date().toISOString()
            };
            console.log('[Node Backend] Step 4: Received negotiation result from Python backend:', pythonResult);

            // Step 2: Generate a natural language response from the Python backend's JSON output
            const spokenResponse = await generateSpokenResponse(pythonResult);
            console.log(`[Node Backend] Step 5: Generated spoken response: "${spokenResponse}"`);

            // Send the final text back to the frontend to be spoken
            res.json({
                spokenResponse: spokenResponse,
                // also send the context so the frontend can hold onto it
                context: {
                    originalRequest: meetingDetailsJSON,
                    negotiationResult: pythonResult
                }
            });

        } else if (action === 'confirm') {
            // This part would handle "yes/no" after the initial response
            // For the hackathon, you can expand this to call the /schedule endpoint on the Python backend
            console.log(`[Node Backend] Confirmation received: "${transcript}"`);
            console.log('[Node Backend] Context received for confirmation:', context);
            
            // Here, you would confirm the intent is "yes" and then call the Python /schedule endpoint
            // with the context.negotiationResult.available_slots[0] and context.originalRequest
            
            res.json({
                spokenResponse: "Great! I have scheduled that meeting for you.",
                finalAction: "MEETING_CONFIRMED"
            });
        }


    } catch (error) {
        console.error('Error processing voice command:', error);
        res.status(500).json({ error: 'Failed to process voice command.' });
    }
});

export default router;

