import express from 'express';
import { extractMeetingIntent, generateSpokenResponse } from '../services/geminiService.js';

const router = express.Router();

// Main endpoint to handle the voice command processing flow
router.post('/voice-command', async (req, res) => {
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

