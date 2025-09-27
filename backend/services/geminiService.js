import { GoogleGenerativeAI } from "@google/generative-ai";

// The API key will be provided by the execution environment.
// Leave GEMINI_API_KEY blank if you are running in a managed environment that provides it.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Using a placeholder. This will fail unless run in a managed environment.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Extracts structured meeting details from a natural language transcript.
 * @param {string} transcript - The user's voice command.
 * @returns {Promise<object>} - A JSON object matching the Python backend's MeetingRequest model.
 */
export async function extractMeetingIntent(transcript) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const prompt = `
        You are an intelligent scheduling assistant. Your task is to extract meeting details from a user's voice command and format them into a specific JSON structure.
        The user is located in Ann Arbor, Michigan, United States.
        The current date and time is Saturday, September 27, 2025 at 5:54 PM EDT.

        Analyze the following transcript: "${transcript}"

        Extract the following information:
        1.  "title": The title of the meeting.
        2.  "preferred_date": The preferred date in "YYYY-MM-DD" format. Infer from terms like "today", "tomorrow", or specific dates.
        3.  "preferred_time": The preferred time in "HH:MM" (24-hour) format.
        4.  "duration_minutes": The duration of the meeting in minutes. Default to 60 if not specified.

        Return ONLY the JSON object. Do not include any other text or markdown formatting.

        Example:
        Transcript: "schedule a marketing sync for tomorrow at 2:30 pm for 45 minutes"
        JSON Output:
        {
            "title": "marketing sync",
            "preferred_date": "2025-09-28",
            "preferred_time": "14:30",
            "duration_minutes": 45
        }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean the response to ensure it's valid JSON
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Error extracting meeting intent from Gemini:", error);
        throw new Error("Failed to understand meeting details from the transcript.");
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
        You are an intelligent scheduling assistant. Your task is to create a friendly, concise, and natural-sounding response to the user based on the results of a meeting negotiation.

        Here is the negotiation result in JSON format:
        ${JSON.stringify(negotiationResult, null, 2)}

        Based on this data, generate a spoken response for the user.
        - If 'success' is true and 'available_slots' is not empty, confirm that you found available times and state the best option clearly (the first one in the list). Mention the day, date, and time.
        - If 'success' is false or 'available_slots' is empty, politely inform the user that no slots were found and suggest they try a different time.
        - The response should be a single, fluid sentence. Do not ask a question.

        Example 1 (Success):
        "Okay, I found an available slot for your meeting on Monday, September 29th at 2:00 PM."

        Example 2 (Failure):
        "Sorry, I couldn't find any available times for that request. Would you like to try another day or time?"
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Error generating spoken response from Gemini:", error);
        throw new Error("Failed to generate a spoken response.");
    }
}

