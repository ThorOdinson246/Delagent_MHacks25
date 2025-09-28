interface VoiceServiceResponse {
  success: boolean;
  message: string;
  voice_response?: string;
  scheduling_data?: {
    title: string;
    start_time: string;
    end_time: string;
  };
  meeting_details?: {
    id: string;
    new_time: string;
  };
  context?: {
    originalRequest?: any;
    negotiationResult?: any;
  };
}

class VoiceService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://your-production-url.com' 
      : 'http://localhost:3001';
  }

  async processVoiceCommand(transcript: string, action: string = 'schedule'): Promise<VoiceServiceResponse> {
    try {
      console.log(`Processing voice command: "${transcript}" for action: ${action}`);
      
      const response = await fetch(`${this.baseUrl}/api/voice-command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          action: 'schedule'
        })
      });

      if (!response.ok) {
        throw new Error(`Voice service error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Voice service response:', result);
      
      // Transform the response to match our interface
      return {
        success: true,
        message: result.spokenResponse || 'Voice command processed successfully',
        voice_response: result.spokenResponse,
        context: result.context,
        scheduling_data: result.context?.negotiationResult?.selected_slot ? {
          title: result.context.negotiationResult.meeting_request?.title || 'Meeting',
          start_time: result.context.negotiationResult.selected_slot.start_time,
          end_time: result.context.negotiationResult.selected_slot.end_time
        } : undefined,
        meeting_details: result.context?.negotiationResult?.meeting_id ? {
          id: result.context.negotiationResult.meeting_id,
          new_time: result.context.negotiationResult.selected_slot?.start_time
        } : undefined
      };
    } catch (error) {
      console.error('Voice service error:', error);
      
      // Return a fallback response
      return {
        success: false,
        message: 'Voice processing failed, using fallback parsing',
        voice_response: 'I had trouble processing that request. Please try again or use the form below.'
      };
    }
  }

  async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve([]);
        return;
      }

      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        speechSynthesis.onvoiceschanged = () => {
          resolve(speechSynthesis.getVoices());
        };
        // Fallback timeout
        setTimeout(() => resolve(speechSynthesis.getVoices()), 1000);
      }
    });
  }

  async speakText(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set options
      utterance.rate = options?.rate || 0.9;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 0.8;
      
      if (options?.voice) {
        utterance.voice = options.voice;
      } else {
        // Try to find a good default voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Karen') || 
          voice.name.includes('Samantha') || 
          voice.name.includes('Google') ||
          (voice.lang.startsWith('en') && voice.name.includes('Female')) ||
          voice.lang.startsWith('en')
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => console.log('🔊 TTS playback started');
      utterance.onend = () => {
        console.log('🔇 TTS playback finished');
        resolve();
      };
      utterance.onerror = (e) => {
        console.error('TTS error:', e);
        reject(e);
      };

      speechSynthesis.speak(utterance);
    });
  }
}

export const voiceService = new VoiceService();