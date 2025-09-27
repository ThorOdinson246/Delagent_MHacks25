Voice Agent Orchestrator Backend

This Express.js application serves as an intelligent backend orchestrator for a voice-first scheduling agent. It is designed to sit between a frontend application and a Python-based agent negotiation backend.
Core Workflow

    Receive Transcript: The server receives a plain text transcript from the frontend (e.g., "schedule a marketing sync for tomorrow at 2 pm").

    Intent Extraction (Gemini): It sends the transcript to the Gemini API to be converted into a structured JSON object that the Python backend can understand.

    Negotiate with Python Backend: It sends this JSON to the Python/FastAPI backend to find available meeting slots. (Currently, this call is simulated).

    Generate Spoken Response (Gemini): It takes the JSON response from the Python backend and sends it to the Gemini API to generate a natural, human-like sentence.

    Send Response to Frontend: It sends the final spoken response back to the frontend to be read aloud to the user.

Setup and Installation
1. Project Files

Make sure you have all the necessary project files in a single directory:

    package.json

    server.js

    .env

    routes/api.js

    services/geminiService.js

    services/cartesiaService.js

    README.md

2. Environment Variables

Create a file named .env in the root of your project. This file stores your API key. Add your Gemini API key to it:

GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"

3. Install Dependencies

Open your terminal in the project directory and run the following command to install the required Node.js packages:

npm install

4. Start the Server

To start the application, run the following command in your terminal:

npm start

The server will start and listen on port 3001. You should see a message confirming that the server is running: Server listening on port 3001.
API Endpoint
POST /api/voice-command

This is the single endpoint that manages the entire conversational turn.

    Method: POST

    URL: http://localhost:3001/api/voice-command

    Body (JSON):

{
  "transcript": "schedule a meeting for me at 6pm tomorrow"
}

Example Success Response

{
  "spokenResponse": "Okay, I found an available slot for your meeting on Sunday, September 28th at 6:00 PM."
}

This completes the set of files for your project. You now have everything you need to run the backend orchestrator.