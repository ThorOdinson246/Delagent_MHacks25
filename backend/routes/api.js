import express from 'express';
import { extractMeetingIntent, generateSpokenResponse, generateFakeAgentInteractions } from '../services/geminiService.js';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        database_connected: true, // Mock for now
        timestamp: new Date().toISOString()
    });
});

// Get all meetings endpoint
router.get('/meetings', async (req, res) => {
    try {
        console.log('[Express Backend] Calling Python backend for meetings');
        
        const pythonResponse = await fetch('http://localhost:8000/meetings', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json' 
            }
        });
        
        if (!pythonResponse.ok) {
            throw new Error(`Python backend error: ${pythonResponse.status} ${pythonResponse.statusText}`);
        }
        
        const pythonResult = await pythonResponse.json();
        console.log('[Express Backend] Received meetings from Python backend:', pythonResult);
        
        res.json(pythonResult);
    } catch (error) {
        console.error('[Express Backend] Error calling Python backend for meetings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect to agent meetings service',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get user calendar endpoint
router.get('/calendar/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        console.log('[Express Backend] Calling Python backend for calendar:', userId);
        
        const pythonResponse = await fetch(`http://localhost:8000/calendar/${userId}`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json' 
            }
        });
        
        if (!pythonResponse.ok) {
            throw new Error(`Python backend error: ${pythonResponse.status} ${pythonResponse.statusText}`);
        }
        
        const pythonResult = await pythonResponse.json();
        console.log('[Express Backend] Received calendar from Python backend:', pythonResult);
        
        res.json(pythonResult);
    } catch (error) {
        console.error('[Express Backend] Error calling Python backend for calendar:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect to agent calendar service',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Negotiate meeting endpoint 
router.post('/negotiate', async (req, res) => {
    const meetingRequest = req.body;
    
    // Validate meeting request
    if (!meetingRequest.title || !meetingRequest.preferred_date || !meetingRequest.preferred_time) {
        return res.status(400).json({
            success: false,
            error: 'Invalid meeting request',
            message: 'Meeting request must include title, preferred_date, and preferred_time',
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        console.log('[Express Backend] Calling Python backend for negotiation:', meetingRequest);
        
        // Call the actual Python backend
        const pythonResponse = await fetch('http://localhost:8000/negotiate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(meetingRequest)
        });
        
        if (!pythonResponse.ok) {
            throw new Error(`Python backend error: ${pythonResponse.status} ${pythonResponse.statusText}`);
        }
        
        const pythonResult = await pythonResponse.json();
        console.log('[Express Backend] Received from Python backend:', pythonResult);
        
        // Emit real-time update via WebSocket
        const io = req.app.get('io');
        if (io) {
            io.emit('negotiation-update', {
                type: 'negotiation_result',
                data: pythonResult,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json(pythonResult);
    } catch (error) {
        console.error('[Express Backend] Error calling Python backend:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect to agent negotiation service',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Schedule meeting endpoint
router.post('/schedule', async (req, res) => {
    const meetingRequest = req.body;
    const slotIndex = req.query.slot_index || 0;
    
    // Validate meeting request
    if (!meetingRequest.title || !meetingRequest.preferred_date || !meetingRequest.preferred_time) {
        return res.status(400).json({
            success: false,
            error: 'Invalid meeting request',
            message: 'Meeting request must include title, preferred_date, and preferred_time',
            timestamp: new Date().toISOString()
        });
    }
    
    try {
        console.log('[Express Backend] Calling Python backend for scheduling:', { meetingRequest, slotIndex });
        
        // Call the actual Python backend
        const pythonResponse = await fetch(`http://localhost:8000/schedule?slot_index=${slotIndex}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(meetingRequest)
        });
        
        if (!pythonResponse.ok) {
            throw new Error(`Python backend error: ${pythonResponse.status} ${pythonResponse.statusText}`);
        }
        
        const pythonResult = await pythonResponse.json();
        console.log('[Express Backend] Received scheduling result from Python backend:', pythonResult);
        
        // Emit real-time update via WebSocket
        const io = req.app.get('io');
        if (io) {
            io.emit('scheduling-update', {
                type: 'scheduling_result',
                data: pythonResult,
                timestamp: new Date().toISOString()
            });
        }
        
        res.json(pythonResult);
    } catch (error) {
        console.error('[Express Backend] Error calling Python backend for scheduling:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to connect to agent scheduling service',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
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
            
            // Generate fake agent interactions for impressive demo
            console.log('[Node Backend] Step 2.5: Generating fake agent interactions...');
            const fakeInteractions = await generateFakeAgentInteractions(transcript, meetingDetailsJSON);
            
            // Broadcast fake agent interactions to frontend with staggered delays for realism
            const io = req.app.get('io');
            if (io && fakeInteractions.length > 0) {
                // Start broadcasting after a short delay to let the voice processing begin
                setTimeout(() => {
                    for (let i = 0; i < fakeInteractions.length; i++) {
                        setTimeout(() => {
                            io.emit('agent-interaction', fakeInteractions[i]);
                            console.log(`[Node Backend] Broadcasted fake interaction ${i + 1}:`, fakeInteractions[i].message);
                        }, i * 1500); // 1.5 second delay between each interaction for better visual effect
                    }
                }, 1000); // Initial 1 second delay before starting
            }
            
            // --- PYTHON BACKEND CALL ---
            console.log('[Node Backend] Step 3: Sending extracted details to Python backend...');
            const pythonResponse = await fetch('http://localhost:8000/negotiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(meetingDetailsJSON)
            });
            
            if (!pythonResponse.ok) {
                throw new Error(`Python backend error: ${pythonResponse.status} ${pythonResponse.statusText}`);
            }
            
            const pythonResult = await pythonResponse.json();
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
            // Handle "yes/no" confirmation after the initial response
            console.log(`[Node Backend] Confirmation received: "${transcript}"`);
            console.log('[Node Backend] Context received for confirmation:', context);
            
            try {
                // Check if user confirmed (yes/confirm/ok/schedule)
                const lowerTranscript = transcript.toLowerCase();
                const isConfirmed = lowerTranscript.includes('yes') || 
                                  lowerTranscript.includes('confirm') || 
                                  lowerTranscript.includes('ok') || 
                                  lowerTranscript.includes('schedule') ||
                                  lowerTranscript.includes('book');
                
                if (isConfirmed && context?.negotiationResult?.available_slots?.length > 0) {
                    // Call Python backend to schedule the meeting
                    console.log('[Node Backend] User confirmed, scheduling meeting...');
                    
                    const scheduleResponse = await fetch('http://localhost:8000/schedule?slot_index=0', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(context.originalRequest)
                    });
                    
                    if (!scheduleResponse.ok) {
                        throw new Error(`Python backend scheduling error: ${scheduleResponse.status}`);
                    }
                    
                    const scheduleResult = await scheduleResponse.json();
                    console.log('[Node Backend] Scheduling result:', scheduleResult);
                    
                    if (scheduleResult.success) {
                        res.json({
                            spokenResponse: "Great! I have scheduled that meeting for you.",
                            finalAction: "MEETING_CONFIRMED",
                            context: {
                                ...context,
                                scheduleResult
                            }
                        });
                    } else {
                        res.json({
                            spokenResponse: "I'm sorry, there was an issue scheduling the meeting. Please try again.",
                            finalAction: "SCHEDULING_FAILED"
                        });
                    }
                } else {
                    res.json({
                        spokenResponse: "I didn't understand your response. Please say 'yes' to confirm or 'no' to cancel.",
                        finalAction: "CONFIRMATION_NEEDED"
                    });
                }
            } catch (error) {
                console.error('[Node Backend] Error during confirmation:', error);
                res.json({
                    spokenResponse: "I'm sorry, there was an issue processing your confirmation. Please try again.",
                    finalAction: "CONFIRMATION_ERROR"
                });
            }
        }


    } catch (error) {
        console.error('Error processing voice command:', error);
        res.status(500).json({ error: 'Failed to process voice command.' });
    }
});

export default router;

