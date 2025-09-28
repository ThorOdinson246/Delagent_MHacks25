# Setup Instructions for API Keys

## Required API Keys

### 1. Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key or use an existing one
3. Copy the API key and update the `.env` file:
   ```
   GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ```

### 2. Cartesia TTS API Key
1. Sign up at [Cartesia](https://cartesia.ai)
2. Get your API key from the dashboard
3. Update the `.env` file:
   ```
   CARTESIA_API_KEY="your_actual_cartesia_api_key_here"
   ```

## Environment Configuration

The backend expects these environment variables in the `.env` file:

```env
# Database
DATABASE_URL="file:./dev.db"

# AI Services
GEMINI_API_KEY="your_gemini_api_key_here"
CARTESIA_API_KEY="your_cartesia_api_key_here"
CARTESIA_BASE_URL="https://api.cartesia.ai"
DEFAULT_VOICE_ID="a0e99841-438c-4a64-b679-ae26e5e21b1e"

# Server Configuration
PORT="3002"
NODE_ENV="development"
LOG_LEVEL="info"
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your_jwt_secret_here"
```

## Quick Setup

If you want to test without API keys, the backend will run in mock mode:
- Gemini responses will return empty extraction data
- TTS will return success without actual audio generation

For full functionality, replace the placeholder API keys with real ones.
