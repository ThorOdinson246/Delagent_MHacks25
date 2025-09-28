class TTSService {
  private audioContext: AudioContext | null = null;

  private async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async textToSpeech(text: string): Promise<void> {
    if (!text.trim()) {
      throw new Error("Text cannot be empty");
    }

    try {
      await this.initAudioContext();

      // Make API call to our backend TTS route
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      // Get the audio data as ArrayBuffer
      const audioBuffer = await response.arrayBuffer();

      // Convert ArrayBuffer to audio and play
      await this.playAudioBuffer(audioBuffer);
    } catch (error) {
      console.error("Text-to-speech error:", error);
      throw new Error("Failed to convert text to speech");
    }
  }

  private async playAudioBuffer(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error("Audio context not initialized");
    }

    try {
      // Decode the audio data
      const decodedData = await this.audioContext.decodeAudioData(audioBuffer.slice(0));
      
      // Create audio source
      const source = this.audioContext.createBufferSource();
      source.buffer = decodedData;
      source.connect(this.audioContext.destination);
      
      // Play the audio
      source.start();

      // Return a promise that resolves when audio finishes playing
      return new Promise((resolve) => {
        source.onended = () => resolve();
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      throw new Error("Failed to play audio");
    }
  }

  // Alternative method using HTML5 Audio API (more compatible but less control)
  async textToSpeechSimple(text: string): Promise<void> {
    if (!text.trim()) {
      throw new Error("Text cannot be empty");
    }

    try {
      // Make API call to our backend TTS route
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      // Create a blob from the response
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      
      // Create and play audio element
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error("Failed to play audio"));
        };
        
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error("Text-to-speech error:", error);
      throw new Error("Failed to convert text to speech");
    }
  }
}

export const ttsService = new TTSService();
