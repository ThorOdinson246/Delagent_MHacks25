import axios from 'axios';
import { logger } from '../utils/logger';

export interface TTSRequest {
  text: string;
  voice_id?: string;
  output_format?: string;
  speed?: number;
  emotion?: string;
}

export interface TTSResponse {
  success: boolean;
  audio_url?: string;
  audio_data?: Buffer;
  error?: string;
}

export class TTSService {
  private apiKey: string;
  private baseUrl: string;
  private defaultVoiceId: string;

  constructor() {
    this.apiKey = process.env.CARTESIA_API_KEY || '';
    this.baseUrl = process.env.CARTESIA_BASE_URL || 'https://api.cartesia.ai';
    this.defaultVoiceId = process.env.DEFAULT_VOICE_ID || 'a0e99841-438c-4a64-b679-ae26e5e21b1e'; // Default Cartesia voice
    
    if (!this.apiKey) {
      logger.warn('CARTESIA_API_KEY not found. TTS functionality will be disabled.');
    }
  }

  async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'TTS service not configured'
      };
    }

    try {
      const payload = {
        model_id: 'sonic-english',
        transcript: request.text,
        voice: {
          mode: 'id',
          id: request.voice_id || this.defaultVoiceId
        },
        output_format: {
          container: 'mp3',
          encoding: 'mp3',
          sample_rate: 44100
        },
        speed: request.speed || 1.0,
        emotion: request.emotion || 'neutral'
      };

      const response = await axios.post(
        `${this.baseUrl}/tts/bytes`,
        payload,
        {
          headers: {
            'Cartesia-Version': '2024-06-10',
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      logger.info('TTS generation successful', {
        textLength: request.text.length,
        voiceId: request.voice_id || this.defaultVoiceId
      });

      return {
        success: true,
        audio_data: Buffer.from(response.data)
      };

    } catch (error: any) {
      logger.error('TTS generation failed', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      return {
        success: false,
        error: 'Failed to generate speech'
      };
    }
  }

  async generateMeetingFeedback(
    meetingResult: any,
    negotiationSummary?: string
  ): Promise<TTSResponse> {
    let feedbackText = '';

    if (meetingResult.success && meetingResult.selected_slot) {
      feedbackText = `Great! I've successfully scheduled your ${meetingResult.meeting_request.title} ` +
        `for ${meetingResult.selected_slot.date_formatted} at ${meetingResult.selected_slot.time_formatted}. ` +
        `The meeting will last ${meetingResult.meeting_request.duration_minutes} minutes.`;
      
      if (negotiationSummary) {
        feedbackText += ` ${negotiationSummary}`;
      }
    } else {
      feedbackText = `I couldn't find a suitable time slot for your meeting. `;
      
      if (meetingResult.available_slots && meetingResult.available_slots.length > 0) {
        feedbackText += `However, I found ${meetingResult.available_slots.length} alternative time slots. ` +
          `Would you like me to suggest some options?`;
      } else {
        feedbackText += `There don't seem to be any available slots in the requested timeframe. ` +
          `Would you like to try a different date or time?`;
      }
      
      if (negotiationSummary) {
        feedbackText += ` ${negotiationSummary}`;
      }
    }

    return this.generateSpeech({
      text: feedbackText,
      emotion: meetingResult.success ? 'positive' : 'neutral'
    });
  }

  async generateAgentUpdate(agentName: string, reasoning: any): Promise<TTSResponse> {
    let updateText = '';

    switch (reasoning.decision) {
      case 'accept':
        updateText = `${agentName} has accepted the meeting proposal. ${reasoning.agent_response}`;
        break;
      case 'counter_propose':
        updateText = `${agentName} has a counter-proposal. ${reasoning.agent_response}`;
        if (reasoning.counter_proposal) {
          updateText += ` They suggest ${reasoning.counter_proposal.alternative_date} at ${reasoning.counter_proposal.alternative_time}.`;
        }
        break;
      case 'reject':
        updateText = `${agentName} cannot attend the proposed meeting. ${reasoning.agent_response}`;
        break;
    }

    return this.generateSpeech({
      text: updateText,
      emotion: reasoning.decision === 'accept' ? 'positive' : 'neutral'
    });
  }

  getAvailableVoices(): string[] {
    // Return list of available Cartesia voice IDs
    return [
      'a0e99841-438c-4a64-b679-ae26e5e21b1e', // Professional female
      '79a125e8-cd45-4c13-8a67-188112f4dd22', // Professional male
      '87748186-23bb-4158-a1eb-332911b0b708', // Friendly female
      '2ee87190-8f84-4925-97da-e52547f9462c'  // Friendly male
    ];
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a very short phrase
      const result = await this.generateSpeech({ 
        text: 'Test' 
      });
      return result.success;
    } catch {
      return false;
    }
  }
}

export const ttsService = new TTSService();
