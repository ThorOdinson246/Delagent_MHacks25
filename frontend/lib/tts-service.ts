class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private currentVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      
      // Load voices when they become available
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    
    // Prefer English voices, especially US English
    const preferredVoices = this.voices.filter(voice => 
      voice.lang.startsWith('en') && 
      (voice.name.includes('US') || voice.name.includes('American') || voice.name.includes('Google'))
    );
    
    if (preferredVoices.length > 0) {
      this.currentVoice = preferredVoices[0];
    } else if (this.voices.length > 0) {
      this.currentVoice = this.voices[0];
    }
    
    console.log('Available voices:', this.voices.map(v => `${v.name} (${v.lang})`));
    console.log('Selected voice:', this.currentVoice?.name);
  }

  speak(text: string, options: {
    rate?: number;
    pitch?: number;
    volume?: number;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  } = {}) {
    if (!text.trim()) {
      console.warn('TTS: Empty text provided');
      return;
    }

    if (!this.synth) {
      console.warn('TTS: Speech synthesis not available (server-side rendering)');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    if (this.currentVoice) {
      utterance.voice = this.currentVoice;
    }
    
    // Set speech parameters
    utterance.rate = options.rate || 0.9; // Slightly slower for better comprehension
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 0.8;
    
    // Set event handlers
    utterance.onend = () => {
      console.log('TTS: Speech completed');
      options.onEnd?.();
    };
    
    utterance.onerror = (event) => {
      console.error('TTS: Speech error:', event);
      options.onError?.(new Error(`Speech synthesis error: ${event.error}`));
    };
    
    utterance.onstart = () => {
      console.log('TTS: Speech started');
    };
    
    // Speak the text
    console.log('TTS: Speaking:', text);
    this.synth.speak(utterance);
  }

  stop() {
    if (!this.synth) return;
    this.synth.cancel();
    console.log('TTS: Speech stopped');
  }

  isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }

  pause() {
    if (!this.synth) return;
    this.synth.pause();
  }

  resume() {
    if (!this.synth) return;
    this.synth.resume();
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  setVoice(voice: SpeechSynthesisVoice) {
    this.currentVoice = voice;
    console.log('TTS: Voice changed to:', voice.name);
  }
}

// Only create TTS service in browser environment
export const ttsService = typeof window !== 'undefined' ? new TTSService() : null;