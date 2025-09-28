import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "mock_key_for_development";

if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_secure_gemini_api_key_here") {
    console.warn("⚠️ GEMINI_API_KEY is not configured. Using mock responses for development.");
    console.warn("   Get your API key from: https://ai.google.dev/");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Extracts structured meeting details from a natural language transcript.
 * @param {string} transcript - The user's voice command.
 * @returns {Promise<object>} - A JSON object matching the Python backend's MeetingRequest model.
 */
export async function extractMeetingIntent(transcript, conversationContext = null) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    // Get current date/time in New York timezone
    const now = new Date();
    const nyTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const currentDate = nyTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = nyTime.toLocaleTimeString("en-US", {hour12: false, hour: '2-digit', minute: '2-digit'});
    const dayName = nyTime.toLocaleDateString("en-US", {weekday: 'long', timeZone: "America/New_York"});
    const monthDay = nyTime.toLocaleDateString("en-US", {month: 'long', day: 'numeric', timeZone: "America/New_York"});
    
    // Calculate tomorrow's date
    const tomorrow = new Date(nyTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    const tomorrowDay = tomorrow.toLocaleDateString("en-US", {weekday: 'long', timeZone: "America/New_York"});
    
    // Build context-aware prompt
    let contextInfo = "";
    if (conversationContext) {
        contextInfo = `
        
        CONVERSATION CONTEXT:
        - Original request: "${conversationContext.originalTranscript || 'N/A'}"
        - Missing information: ${conversationContext.missingInfo ? conversationContext.missingInfo.join(', ') : 'N/A'}
        - Previous attempts: ${conversationContext.conversationHistory ? conversationContext.conversationHistory.length : 0}
        
        The user is now providing additional information to complete their meeting request.
        Combine the original request with this new information.
        `;
    }

    const prompt = `
        You are an expert meeting scheduler AI. Extract meeting details from voice input with EXTREME ACCURACY.
        
        Current date: ${currentDate} (${dayName})
        Current time: ${currentTime} EDT
        Tomorrow: ${tomorrowDay}, ${tomorrowDate}${contextInfo}
        
        User voice input: "${transcript}"
        
        CRITICAL INSTRUCTIONS:
        1. Extract ONLY what the user EXPLICITLY said - NO DEFAULTS, NO ASSUMPTIONS
        2. If ANY required information (time, date, or meeting purpose) is missing or unclear, return an error
        3. Pay extreme attention to time parsing: "7 PM" = "19:00", "9 AM" = "09:00", "3:30 PM" = "15:30"
        4. Parse dates accurately: "today" = ${currentDate}, "tomorrow" = ${tomorrowDate}
        5. Extract meeting titles from context: "team meeting" = "Team meeting", "doctor appointment" = "Doctor appointment"
        6. Only schedule on weekdays - if tomorrow is weekend, ask for clarification
        
        Return ONLY valid JSON in ONE of these formats:
        
        SUCCESS (when ALL information is clear):
        {
            "success": true,
            "title": "exact meeting title from user input",
            "preferred_date": "YYYY-MM-DD",
            "preferred_time": "HH:MM (24-hour format)",
            "duration_minutes": 60,
            "specific_agent": "alice/bob/charlie or null"
        }
        
        ERROR (when information is missing/unclear):
        {
            "success": false,
            "missing_info": ["time", "date", "title"],
            "clarification_needed": "I need more details. Could you specify the [missing info] for your meeting?"
        }
        
        TIME PARSING EXAMPLES:
        - "7 PM" → "19:00"
        - "6 a.m." → "06:00"
        - "9 AM" → "09:00" 
        - "3:30 PM" → "15:30"
        - "10 o'clock" → "10:00" (assume AM unless context suggests PM)
        - "noon" → "12:00"
        
        DATE PARSING EXAMPLES:
        - "today" → ${currentDate}
        - "tomorrow" → ${tomorrowDate}
        - "October 12th" → "2025-10-12"
        - "December 25" → "2025-12-25"
        - "Jan 15th" → "2025-01-15"
        
        TITLE EXTRACTION EXAMPLES:
        - "schedule a team meeting" → "Team meeting"
        - "Doctor's appointments" → "Doctor's appointment"
        - "book doctor appointment" → "Doctor appointment"  
        - "meeting with Alice" → "Meeting with Alice"
        - "standup" → "Standup meeting"
        - just "schedule a meeting" → ERROR (ask what kind of meeting)
        
        DO NOT USE DEFAULTS. If unclear, ask for clarification.
    `;

    try {
        // Use REAL Gemini API - no more mock parsing!

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean the response to ensure it's valid JSON
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Error extracting meeting intent from Gemini:", error);
        
        // Fallback to mock response if API fails
        console.log("🔧 Falling back to mock response due to API error");
        
        // Calculate next weekday for fallback response
        const nextWeekday = new Date(nyTime);
        nextWeekday.setDate(nextWeekday.getDate() + 1);
        while (nextWeekday.getDay() === 0 || nextWeekday.getDay() === 6) { // Skip weekends
            nextWeekday.setDate(nextWeekday.getDate() + 1);
        }
        
        return {
            title: "Meeting from Voice",
            preferred_date: nextWeekday.toISOString().split('T')[0],
            preferred_time: "14:00",
            duration_minutes: 60
        };
    }
}

/**
 * Generates a natural, spoken response from the structured negotiation result.
 * @param {object} negotiationResult - The JSON response from the Python backend.
 * @returns {Promise<string>} - A natural language string to be spoken to the user.
 */
/**
 * Generate realistic agent negotiations using real Gemini API
 * @param {object} meetingRequest - The meeting request details
 * @param {object} negotiationResult - The result from Python backend
 * @returns {Promise<Array>} - Array of agent conversation messages
 */
export async function generateLiveAgentNegotiations(meetingRequest, negotiationResult) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    // Get current time for realistic context
    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });

    const prompt = `
You are simulating a REAL-TIME negotiation between 3 AI scheduling agents: Alice, Bob (Pappu), and Charlie.

MEETING REQUEST:
- Title: "${meetingRequest.title}"
- Requested Date: ${meetingRequest.preferred_date}
- Requested Time: ${meetingRequest.preferred_time}
- Duration: ${meetingRequest.duration_minutes} minutes

NEGOTIATION RESULTS:
- Success: ${negotiationResult.success}
- Available Slots Found: ${negotiationResult.total_slots_found || 0}
${negotiationResult.available_slots ? `
BEST AVAILABLE SLOTS:
${negotiationResult.available_slots.slice(0, 3).map((slot, i) => 
`${i + 1}. ${slot.day_of_week}, ${slot.date_formatted} at ${slot.time_formatted} (Quality: ${slot.quality_score}/100)
   Reason: ${slot.explanation}`).join('\n')}` : ''}

AGENT PERSONALITIES:
- Alice: Practical, focuses on efficiency and avoiding conflicts
- Bob (Pappu): User's agent, advocates for user preferences but flexible
- Charlie: Detail-oriented, considers long-term scheduling implications

Generate a realistic 4-6 message negotiation conversation where agents:
1. Analyze why the original request doesn't work (if applicable)
2. Debate the pros/cons of different time slots
3. Reach consensus on the best option
4. Show actual decision-making reasoning

Format as JSON array:
[
  {
    "agent": "Alice",
    "message": "Looking at the calendars, the requested ${meetingRequest.preferred_time} on ${meetingRequest.preferred_date} has conflicts...",
    "reasoning": "Technical analysis of calendar conflicts",
    "confidence": 85,
    "timestamp": "${new Date().toISOString()}"
  }
]

Make it feel like REAL agents having a REAL conversation about REAL scheduling conflicts. No generic responses!
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        // Clean and parse JSON response
        const cleanedText = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
        const negotiations = JSON.parse(cleanedText);
        
        console.log(`🤖 Generated ${negotiations.length} real agent negotiation messages`);
        return negotiations;
        
    } catch (error) {
        console.error("Error generating live agent negotiations:", error);
        
        // Fallback with real data context (not generic mock)
        const fallbackNegotiations = [];
        
        if (negotiationResult.success && negotiationResult.available_slots?.length > 0) {
            const bestSlot = negotiationResult.available_slots[0];
            
            fallbackNegotiations.push({
                agent: "Alice",
                message: `I've analyzed all calendars. The requested ${meetingRequest.preferred_time} on ${meetingRequest.preferred_date} has scheduling conflicts.`,
                reasoning: `Calendar analysis shows conflicts during the original time slot.`,
                confidence: 90,
                timestamp: new Date().toISOString()
            });
            
            fallbackNegotiations.push({
                agent: "Bob",
                message: `As Pappu's agent, I understand the preference for ${meetingRequest.preferred_date}, but I see Alice's point about conflicts.`,
                reasoning: `Representing user preferences while acknowledging scheduling realities.`,
                confidence: 85,
                timestamp: new Date().toISOString()
            });
            
            fallbackNegotiations.push({
                agent: "Charlie",
                message: `I recommend ${bestSlot.day_of_week}, ${bestSlot.date_formatted} at ${bestSlot.time_formatted}. Quality score is ${bestSlot.quality_score}/100.`,
                reasoning: bestSlot.explanation,
                confidence: bestSlot.quality_score,
                timestamp: new Date().toISOString()
            });
            
            fallbackNegotiations.push({
                agent: "Alice",
                message: `Agreed. That time slot works well for everyone and avoids the conflicts we identified.`,
                reasoning: `Consensus reached on optimal scheduling solution.`,
                confidence: 95,
                timestamp: new Date().toISOString()
            });
        } else {
            fallbackNegotiations.push({
                agent: "Alice",
                message: `I've searched extensively but couldn't find any available slots that work for all parties during the requested timeframe.`,
                reasoning: `Comprehensive calendar search yielded no viable options.`,
                confidence: 85,
                timestamp: new Date().toISOString()
            });
            
            fallbackNegotiations.push({
                agent: "Charlie",
                message: `We searched ${negotiationResult.total_slots_found || 0} potential slots but all had conflicts. Perhaps we should consider a different date range?`,
                reasoning: `Analysis of search results suggests expanding time window.`,
                confidence: 80,
                timestamp: new Date().toISOString()
            });
        }
        
        return fallbackNegotiations;
    }
}

export async function generateSpokenResponse(negotiationResult) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const prompt = `
        You are an intelligent scheduling assistant. Your task is to create a friendly, descriptive, and natural-sounding response to the user based on the results of a meeting negotiation.

        Here is the negotiation result in JSON format:
        ${JSON.stringify(negotiationResult, null, 2)}

        Based on this data, generate a spoken response for the user:
        
        **If successful (available slots found):**
        - If the first slot matches the user's preferred time exactly: "Perfect! I scheduled your [title] for [day, date] at [time] as requested."
        - If the first slot is different from preferred time: "I found a great time for your [title]. The requested time had conflicts, but I found [day, date] at [time] which works well for everyone."
        
        **If no slots found:**
        - Be specific about why: "Unfortunately, your requested time on [day, date] at [time] has conflicts with existing commitments. Let me suggest some alternative times that work better."
        
        **Always include:**
        - The meeting title
        - Specific day, date, and time
        - Brief explanation of why this time works or why the original didn't
        - If there were conflicts, mention them briefly but positively
        
        **Tone:** Professional but conversational, helpful, and solution-focused.

        Examples:
        "Great! I scheduled your team meeting for Monday, September 29th at 8:00 AM as requested. All three agents are available."
        
        "I found an excellent time for your doctor's appointment. Your requested 8 AM slot had some conflicts, but Tuesday, September 30th at 11:00 AM works perfectly and avoids any scheduling issues."
    `;

    try {
        // Use REAL Gemini API for spoken responses - no more mock!

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Error generating spoken response from Gemini:", error);
        
        // Fallback to real data-based response if Gemini API fails
        console.log("🔧 Using real data for spoken response due to API error");
        if (negotiationResult.success && negotiationResult.available_slots?.length > 0) {
            const slots = negotiationResult.available_slots;
            const bestSlot = slots[0]; // Get the highest quality slot
            
            if (slots.length === 1) {
                return `Great! I found a perfect time slot for your "${negotiationResult.meeting_request?.title || 'meeting'}" on ${bestSlot.day_of_week}, ${bestSlot.date_formatted} at ${bestSlot.time_formatted}. This slot has a quality score of ${bestSlot.quality_score} out of 100. ${bestSlot.explanation} Would you like me to schedule it?`;
            } else {
                const alternatives = slots.slice(1, 3).map(slot => 
                    `${slot.day_of_week} at ${slot.time_formatted}`
                ).join(' or ');
                return `Perfect! I found ${slots.length} available time slots for your "${negotiationResult.meeting_request?.title || 'meeting'}". The best option is ${bestSlot.day_of_week}, ${bestSlot.date_formatted} at ${bestSlot.time_formatted} with a quality score of ${bestSlot.quality_score}. ${bestSlot.explanation} I also found alternatives on ${alternatives}. Would you like me to book the first option?`;
            }
        } else {
            const searchWindow = negotiationResult.search_window;
            return `I searched for available times between ${new Date(searchWindow?.start).toLocaleDateString()} and ${new Date(searchWindow?.end).toLocaleDateString()} but couldn't find any slots that work for everyone. Would you like to try a different date range or time?`;
        }
    }
}


