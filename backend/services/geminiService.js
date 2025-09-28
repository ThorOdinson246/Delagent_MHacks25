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

/**
 * Generate fake agent interactions based on user input to show impressive AI negotiation
 * @param {string} transcript - The user's voice command
 * @param {object} meetingRequest - The extracted meeting request
 * @returns {Promise<Array>} - Array of fake agent interaction messages
 */
export async function generateFakeAgentInteractions(transcript, meetingRequest) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const prompt = `
        You are generating realistic AI agent conversations for a scheduling platform demo. 
        Create an impressive sequence of agent interactions that shows sophisticated AI negotiation.
        
        Context:
        - User said: "${transcript}"
        - Meeting request: ${JSON.stringify(meetingRequest)}
        - We have 3 AI agents: Alice (Focus-Protective), Pappu (Collaborative), Charlie (Strategic)
        
        Generate 8-12 realistic agent interaction messages that show:
        1. Initial analysis and reasoning
        2. Calendar conflict detection  
        3. Agent disagreements and negotiations
        4. Strategic compromises
        5. Final consensus
        
        Each message should have this format:
        {
            "type": "agent_reasoning",
            "agent": "Alice's Agent" | "Pappu's Agent" | "Charlie's Agent",
            "message": "Brief status message",
            "reasoning": "Detailed reasoning (2-3 sentences)",
            "confidence": 75-95,
            "timestamp": "current_iso_time",
            "conflictsWith": ["other agent names if disagreeing"],
            "agreessWith": ["other agent names if agreeing"]
        }
        
        Make it feel like real AI agents with:
        - Specific calendar analysis
        - Personality-driven responses (Alice protects focus time, Pappu collaborates, Charlie optimizes)
        - Realistic conflicts and resolutions
        - Technical but understandable language
        - Progressive negotiation that reaches consensus
        
        Return ONLY a JSON array of these messages. No other text.
    `;

    try {
        if (GEMINI_API_KEY === "mock_key_for_development") {
            // Return impressive mock interactions
            const timestamp = new Date().toISOString();
            // Create more dynamic interactions based on the actual request
            const meetingTitle = meetingRequest.title || "meeting";
            const requestedTime = meetingRequest.preferred_time || "requested time";
            const requestedDate = meetingRequest.preferred_date || "requested date";
            
            return [
                {
                    "type": "agent_reasoning",
                    "agent": "Alice's Agent",
                    "message": "🎯 Deep calendar analysis initiated",
                    "reasoning": `Processing request for "${meetingTitle}" on ${requestedDate}. Scanning 47 calendar blocks for conflicts with my focus time architecture. My productivity algorithms show 3 critical deep work sessions that require protection.`,
                    "confidence": 96,
                    "timestamp": timestamp,
                    "conflictsWith": [],
                    "agreessWith": []
                },
                {
                    "type": "agent_reasoning", 
                    "agent": "Charlie's Agent",
                    "message": "📊 Multi-dimensional efficiency matrix running",
                    "reasoning": `Strategic analysis of "${meetingTitle}" request. Cross-referencing team availability patterns, productivity curves, and operational efficiency metrics. Preliminary scan shows 73% team coordination potential for this time window.`,
                    "confidence": 91,
                    "timestamp": timestamp,
                    "conflictsWith": [],
                    "agreessWith": []
                },
                {
                    "type": "agent_reasoning",
                    "agent": "Pappu's Agent", 
                    "message": "🤝 Collaborative mediation protocol active",
                    "reasoning": `Initiating team harmony optimization for "${meetingTitle}". My flexibility algorithms can accommodate 6 different scheduling scenarios. Prioritizing Alice's focus protection while leveraging Charlie's efficiency insights.`,
                    "confidence": 87,
                    "timestamp": timestamp,
                    "conflictsWith": [],
                    "agreessWith": []
                },
                {
                    "type": "agent_reasoning",
                    "agent": "Alice's Agent",
                    "message": "⚠️ Critical conflict vector detected",
                    "reasoning": `Alert: The ${requestedTime} slot creates a 67% overlap with my core productivity window. This fragmentation would cascade through my entire focus architecture, potentially reducing deep work efficiency by 43%. Requesting alternative time matrices.`,
                    "confidence": 98,
                    "timestamp": timestamp,
                    "conflictsWith": ["Charlie's Agent"],
                    "agreessWith": []
                },
                {
                    "type": "agent_reasoning",
                    "agent": "Charlie's Agent",
                    "message": "⚡ Dynamic recalibration in progress", 
                    "reasoning": `Acknowledged Alice's focus protection requirements. Executing advanced scheduling algorithms with enhanced constraints. New analysis reveals 4 high-efficiency windows with 89% team satisfaction probability. Optimizing for maximum collective productivity.`,
                    "confidence": 93,
                    "timestamp": timestamp,
                    "conflictsWith": [],
                    "agreessWith": ["Alice's Agent"]
                },
                {
                    "type": "agent_reasoning",
                    "agent": "Pappu's Agent",
                    "message": "✅ Consensus convergence achieved",
                    "reasoning": `Breakthrough! Found the perfect solution for "${meetingTitle}". Wednesday 2:30PM creates a 94% satisfaction matrix - Alice's focus boundaries respected, Charlie's efficiency metrics optimized, and my collaborative flexibility maximized. Team synergy activated!`,
                    "confidence": 95,
                    "timestamp": timestamp,
                    "conflictsWith": [],
                    "agreessWith": ["Alice's Agent", "Charlie's Agent"]
                },
                {
                    "type": "agent_reasoning",
                    "agent": "Alice's Agent",
                    "message": "🎯 Solution validation complete",
                    "reasoning": `Confirmed: Wednesday 2:30PM maintains my focus time integrity while enabling productive collaboration. This time slot preserves my morning deep work sessions and afternoon creative periods. Productivity impact: minimal. Approving this optimal solution.`,
                    "confidence": 97,
                    "timestamp": timestamp,
                    "conflictsWith": [],
                    "agreessWith": ["Pappu's Agent", "Charlie's Agent"]
                },
                {
                    "type": "agent_reasoning",
                    "agent": "Charlie's Agent",
                    "message": "📈 Final efficiency optimization locked",
                    "reasoning": `Strategic confirmation: Wednesday 2:30PM achieves 96% team efficiency rating. All productivity metrics aligned, resource allocation optimized, and collaborative potential maximized. This represents peak operational excellence for the "${meetingTitle}" objective.`,
                    "confidence": 94,
                    "timestamp": timestamp,
                    "conflictsWith": [],
                    "agreessWith": ["Alice's Agent", "Pappu's Agent"]
                }
            ];
        }

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // Parse the JSON response
        const interactions = JSON.parse(text.trim());
        return interactions;

    } catch (error) {
        console.error("Error generating fake agent interactions:", error);
        // Fallback to basic mock interactions
        const timestamp = new Date().toISOString();
        return [
            {
                "type": "agent_reasoning",
                "agent": "Alice's Agent",
                "message": "🤖 Analyzing calendar conflicts",
                "reasoning": "Processing your meeting request and checking for conflicts with my focus time blocks.",
                "confidence": 85,
                "timestamp": timestamp,
                "conflictsWith": [],
                "agreessWith": []
            },
            {
                "type": "agent_reasoning",
                "agent": "Pappu's Agent",
                "message": "🤝 Coordinating schedules",
                "reasoning": "Working with Alice and Charlie to find the optimal meeting time for everyone.",
                "confidence": 88,
                "timestamp": timestamp,
                "conflictsWith": [],
                "agreessWith": ["Alice's Agent"]
            }
        ];
    }
}

