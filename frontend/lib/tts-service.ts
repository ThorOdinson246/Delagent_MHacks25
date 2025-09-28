class TTSService {
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    // Cartesia-based TTS doesn't need browser speech synthesis
    console.log('TTS: Initialized with Cartesia API');
  }

  async speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  } = {}): Promise<void> {
    if (!text.trim()) {
      console.warn('TTS: Empty text provided');
      return;
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Stop any current speech
        this.stop();

        console.log('TTS: Speaking with Cartesia:', text);

        // Call our Cartesia TTS API
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.status}`);
        }

        // Get the audio blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio element
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;

        audio.onended = () => {
          console.log('TTS: Cartesia speech completed');
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          options.onEnd?.();
          resolve();
        };

        audio.onerror = (event) => {
          console.error('TTS: Cartesia audio error:', event);
          this.currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          const error = new Error('Cartesia audio playback error');
          options.onError?.(error);
          reject(error);
        };

        audio.onloadstart = () => {
          console.log('TTS: Cartesia speech started');
        };

        // Set volume if specified
        if (options.volume !== undefined) {
          audio.volume = Math.max(0, Math.min(1, options.volume));
        } else {
          audio.volume = 0.8; // Default volume
        }

        // Play the audio
        await audio.play();
      } catch (error) {
        console.error('TTS: Cartesia error:', error);
        const ttsError = error instanceof Error ? error : new Error('Unknown Cartesia TTS error');
        options.onError?.(ttsError);
        reject(ttsError);
      }
    });
  }

  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      console.log('TTS: Cartesia speech stopped');
    }
  }

  isSpeaking(): boolean {
    return this.currentAudio ? !this.currentAudio.paused : false;
  }

  pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      console.log('TTS: Cartesia speech paused');
    }
  }

  resume() {
    if (this.currentAudio) {
      this.currentAudio.play();
      console.log('TTS: Cartesia speech resumed');
    }
  }

  getAvailableVoices(): string[] {
    // Cartesia voices - return available voice IDs
    return ['sonic-2']; // Default Cartesia voice
  }

  setVoice(voiceId: string) {
    // Voice selection would be handled in the API call
    console.log('TTS: Voice preference set to:', voiceId);
  }
}

// Only create TTS service in browser environment
export const ttsService = typeof window !== 'undefined' ? new TTSService() : null;