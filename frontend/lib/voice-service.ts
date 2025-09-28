// Service to integrate with Express backend voice orchestrator
class VoiceService {
  private baseUrl = "http://localhost:4000"

  async processVoiceCommand(transcript: string, action: string = "schedule", context?: any) {
    const response = await fetch(`${this.baseUrl}/api/voice-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript,
        action,
        context
      }),
    })

    if (!response.ok) {
      throw new Error(`Voice command failed: ${response.status}`)
    }

    return response.json()
  }
}

export const voiceService = new VoiceService()