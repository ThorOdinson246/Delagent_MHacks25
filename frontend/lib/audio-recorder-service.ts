class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private audioLevelCallback: ((levels: number[]) => void) | null = null;
  
  // Voice Activity Detection
  private silenceThreshold: number = 15; // Audio level below this is considered silence
  private silenceTimeout: number = 3000; // Auto-stop after 3 seconds of silence
  private lastVoiceActivityTime: number = 0;
  private silenceCheckInterval: NodeJS.Timeout | null = null;
  private autoStopCallback: (() => void) | null = null;
  private vadEnabled: boolean = true;

  async checkPermissions(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("MediaDevices API not supported");
        return false;
      }

      const result = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
      console.log("Microphone permission status:", result?.state);
      return result?.state === 'granted' || result?.state === 'prompt';
    } catch (error) {
      console.log("Permission check not supported, will try direct access");
      return true; // Assume we can try
    }
  }

  async startRecording(): Promise<void> {
    try {
      // Request microphone access with simpler constraints
      console.log("Requesting microphone access...");
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      });

      console.log("Microphone access granted, setting up recorder...");

      // Check supported MIME types
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log("Using MIME type:", mimeType);
          break;
        }
      }

      if (!selectedMimeType) {
        selectedMimeType = ''; // Let browser choose default
        console.log("Using default MIME type");
      }

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType
      });

      this.audioChunks = [];

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        console.log("Audio data available:", event.data.size, "bytes");
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      // Set up audio analysis for visualizer
      this.setupAudioAnalysis();

      // Start recording
      this.mediaRecorder.start(1000); // Record in 1-second chunks
      
      // Start silence detection for auto-stop
      if (this.vadEnabled) {
        this.startSilenceDetection();
      }
      
      console.log("Recording started successfully");
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      
      // More specific error messages
      if (error?.name === 'NotAllowedError') {
        throw new Error("Microphone permission denied. Please allow microphone access and try again.");
      } else if (error?.name === 'NotFoundError') {
        throw new Error("No microphone found. Please connect a microphone and try again.");
      } else if (error?.name === 'NotReadableError') {
        throw new Error("Microphone is being used by another application. Please close other apps and try again.");
      } else {
        throw new Error(`Failed to access microphone: ${error?.message || 'Unknown error'}`);
      }
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private setupAudioAnalysis(): void {
    if (!this.stream) return;

    try {
      // Create audio context and analyzer
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      // Configure analyzer
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      // Connect stream to analyzer
      const source = this.audioContext.createMediaStreamSource(this.stream);
      source.connect(this.analyser);
      
      // Start analyzing audio
      this.analyzeAudio();
    } catch (error) {
      console.warn("Failed to set up audio analysis:", error);
    }
  }

  private analyzeAudio(): void {
    if (!this.analyser || !this.dataArray) return;

    const analyze = () => {
      this.analyser!.getByteFrequencyData(this.dataArray!);
      
      // Convert frequency data to audio levels (0-100)
      const levels: number[] = [];
      const chunkSize = Math.ceil(this.dataArray!.length / 32); // 32 frequency bands
      let maxLevel = 0;
      
      for (let i = 0; i < 32; i++) {
        let sum = 0;
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, this.dataArray!.length);
        
        for (let j = start; j < end; j++) {
          sum += this.dataArray![j];
        }
        
        const average = sum / (end - start);
        const level = (average / 255) * 100;
        levels.push(level);
        maxLevel = Math.max(maxLevel, level);
      }
      
      // Voice Activity Detection
      if (this.vadEnabled && this.isRecording()) {
        if (maxLevel > this.silenceThreshold) {
          this.lastVoiceActivityTime = Date.now();
        }
      }
      
      // Call callback with levels
      if (this.audioLevelCallback) {
        this.audioLevelCallback(levels);
      }
      
      this.animationId = requestAnimationFrame(analyze);
    };
    
    analyze();
  }

  setAudioLevelCallback(callback: (levels: number[]) => void): void {
    this.audioLevelCallback = callback;
  }

  // Voice Activity Detection methods
  setAutoStopCallback(callback: () => void): void {
    this.autoStopCallback = callback;
  }

  private silenceCountdownCallback: ((remainingTime: number | null) => void) | null = null;

  setSilenceCountdownCallback(callback: (remainingTime: number | null) => void): void {
    this.silenceCountdownCallback = callback;
  }

  enableVAD(enabled: boolean = true): void {
    this.vadEnabled = enabled;
  }

  setSilenceThreshold(threshold: number): void {
    this.silenceThreshold = Math.max(0, Math.min(100, threshold));
  }

  setSilenceTimeout(timeoutMs: number): void {
    this.silenceTimeout = Math.max(1000, timeoutMs);
  }

  private startSilenceDetection(): void {
    this.lastVoiceActivityTime = Date.now();
    
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
    }
    
    this.silenceCheckInterval = setInterval(() => {
      if (!this.vadEnabled || !this.isRecording()) {
        return;
      }
      
      const silenceDuration = Date.now() - this.lastVoiceActivityTime;
      const remainingTime = this.silenceTimeout - silenceDuration;
      
      // Update countdown if we're in the silence period
      if (silenceDuration > 1000 && remainingTime > 0) { // Start showing countdown after 1 second of silence
        if (this.silenceCountdownCallback) {
          this.silenceCountdownCallback(remainingTime);
        }
      } else if (remainingTime <= 0) {
        // Clear countdown and trigger auto-stop
        if (this.silenceCountdownCallback) {
          this.silenceCountdownCallback(null);
        }
      } else {
        // Not in silence period, clear countdown
        if (this.silenceCountdownCallback) {
          this.silenceCountdownCallback(null);
        }
      }
      
      if (silenceDuration > this.silenceTimeout) {
        console.log(`Auto-stopping recording after ${silenceDuration}ms of silence`);
        this.stopSilenceDetection(); // Stop first to prevent multiple calls
        if (this.autoStopCallback) {
          this.autoStopCallback();
        }
      }
    }, 200); // Check every 200ms for smoother countdown
  }

  private stopSilenceDetection(): void {
    if (this.silenceCheckInterval) {
      clearInterval(this.silenceCheckInterval);
      this.silenceCheckInterval = null;
    }
  }

  private cleanup(): void {
    // Stop silence detection
    this.stopSilenceDetection();
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close().catch(console.warn);
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.audioLevelCallback = null;
    this.silenceCountdownCallback = null;
    this.autoStopCallback = null;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  async sendAudioToSTT(audioBlob: Blob): Promise<string> {
    console.log("Sending audio to STT API:", {
      size: audioBlob.size,
      type: audioBlob.type
    });

    const formData = new FormData();
    // Use appropriate file extension based on blob type
    const fileName = audioBlob.type.includes('webm') ? 'recording.webm' : 
                    audioBlob.type.includes('mp4') ? 'recording.mp4' : 'recording.wav';
    
    formData.append('audio', audioBlob, fileName);

    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("STT API error:", errorData);
      throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("STT API response:", result);
    
    return result.transcript || "";
  }
}

export const audioRecorderService = new AudioRecorderService();
