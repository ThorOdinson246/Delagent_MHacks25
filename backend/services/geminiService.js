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
export async function extractMeetingIntent(transcript) {
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
    
    const prompt = `
        You are an intelligent scheduling assistant. Your task is to extract meeting details from a user's voice command and format them into a specific JSON structure.
        The user is located in New York, United States (Eastern Time).
        The current date and time is ${dayName}, ${monthDay} at ${currentTime} EDT.
        Today's date is ${currentDate}.
        Tomorrow (${tomorrowDay}) is ${tomorrowDate}.
        
        IMPORTANT: Only schedule meetings on weekdays (Monday-Friday). If the user requests "tomorrow" and tomorrow is a weekend, 
        schedule for the next available weekday instead.

        Analyze the following transcript: "${transcript}"

        Extract the following information:
        1.  "title": The title of the meeting.
        2.  "preferred_date": The preferred date in "YYYY-MM-DD" format. Infer from terms like "today", "tomorrow", or specific dates.
        3.  "preferred_time": The preferred time in "HH:MM" (24-hour) format.
        4.  "duration_minutes": The duration of the meeting in minutes. Default to 60 if not specified.
        5.  "specific_agent": If the user mentions meeting with a specific person (Alice, Bob, Charlie), extract their name. Otherwise, leave null for multi-agent scheduling.

        Return ONLY the JSON object. Do not include any other text or markdown formatting.

        Examples:
        
        Transcript: "schedule a marketing sync for tomorrow at 2:30 pm for 45 minutes"
        JSON Output:
        {
            "title": "marketing sync",
            "preferred_date": "${tomorrowDate}",
            "preferred_time": "14:30",
            "duration_minutes": 45,
            "specific_agent": null
        }
        
        Transcript: "set up a meeting with Alice tomorrow at 10am"
        JSON Output:
        {
            "title": "meeting with Alice",
            "preferred_date": "${tomorrowDate}",
            "preferred_time": "10:00",
            "duration_minutes": 60,
            "specific_agent": "alice"
        }
    `;

    try {
        // If using mock key, return a mock response
        if (GEMINI_API_KEY === "mock_key_for_development") {
            console.log("🔧 Using mock Gemini response for development");
            
            // Calculate next weekday for mock response
            const nextWeekday = new Date(nyTime);
            nextWeekday.setDate(nextWeekday.getDate() + 1);
            while (nextWeekday.getDay() === 0 || nextWeekday.getDay() === 6) { // Skip weekends
                nextWeekday.setDate(nextWeekday.getDate() + 1);
            }
            
            // Extract specific agent from transcript
            const lowerTranscript = transcript.toLowerCase();
            let specificAgent = null;
            if (lowerTranscript.includes("alice")) specificAgent = "alice";
            else if (lowerTranscript.includes("bob")) specificAgent = "bob";
            else if (lowerTranscript.includes("charlie")) specificAgent = "charlie";

            return {
                title: transcript.includes("doctor") || transcript.includes("appointment") ? 
                       (transcript.includes("doctor") ? "Doctor's appointment" : "appointment") :
                       transcript.includes("meeting") ? "meeting" : "Meeting from Voice",
                preferred_date: nextWeekday.toISOString().split('T')[0],
                preferred_time: transcript.includes("9") ? "09:00" : "14:00",
                duration_minutes: 60,
                specific_agent: specificAgent
            };
        }

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
        // If using mock key, return a mock response
        if (GEMINI_API_KEY === "mock_key_for_development") {
            console.log("🔧 Using mock spoken response for development");
            if (negotiationResult.success && negotiationResult.available_slots?.length > 0) {
                const firstSlot = negotiationResult.available_slots[0];
                const meetingTitle = negotiationResult.meeting_request?.title || "meeting";
                const requestedTime = negotiationResult.meeting_request?.preferred_time || "requested time";
                
                // Check if the suggested time matches the requested time
                const isExactMatch = firstSlot.time_formatted === requestedTime;
                
                if (isExactMatch) {
                    return `Perfect! I scheduled your ${meetingTitle} for ${firstSlot.day_of_week}, ${firstSlot.date_formatted} at ${firstSlot.time_formatted} as requested. All agents are available at this time.`;
                } else {
                    return `I found an excellent time for your ${meetingTitle}. Your requested ${requestedTime} slot had some scheduling conflicts, but ${firstSlot.day_of_week}, ${firstSlot.date_formatted} at ${firstSlot.time_formatted} works perfectly and avoids any issues.`;
                }
            } else {
                const meetingTitle = negotiationResult.meeting_request?.title || "meeting";
                const requestedDate = negotiationResult.meeting_request?.preferred_date || "requested date";
                const requestedTime = negotiationResult.meeting_request?.preferred_time || "requested time";
                return `Unfortunately, your requested time for the ${meetingTitle} on ${requestedDate} at ${requestedTime} has conflicts with existing commitments. Let me suggest some alternative times that work better for everyone.`;
            }
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Error generating spoken response from Gemini:", error);
        
        // Fallback to mock response if API fails
        console.log("🔧 Falling back to mock spoken response due to API error");
        if (negotiationResult.success && negotiationResult.available_slots?.length > 0) {
            const firstSlot = negotiationResult.available_slots[0];
            return `I found an available slot for your meeting on ${firstSlot.day_of_week} at ${firstSlot.time_formatted}. Would you like me to schedule it?`;
        } else {
            return "I couldn't find any available times for that request. Would you like to try another day or time?";
        }
    }
}

