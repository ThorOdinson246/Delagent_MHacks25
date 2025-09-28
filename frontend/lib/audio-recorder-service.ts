class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private silenceDetectionInterval: NodeJS.Timeout | null = null;
  private silenceStartTime: number | null = null;
  private autoStopCallback: (() => void) | null = null;
  private countdownCallback: ((secondsLeft: number) => void) | null = null;
  private audioLevels: number[] = [];
  private audioLevelCallback: ((levels: number[]) => void) | null = null;
  
  // VAD Configuration
  private silenceThreshold: number = 12; // Audio level below this is silence
  private silenceTimeout: number = 3000; // Auto-stop after 3 seconds
  private isAutoStopTriggered: boolean = false; // Guard against multiple auto-stop calls

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

  setAutoStopCallback(callback: (() => void) | null) {
    this.autoStopCallback = callback;
  }

  setCountdownCallback(callback: ((secondsLeft: number) => void) | null) {
    this.countdownCallback = callback;
  }

  setAudioLevelCallback(callback: ((levels: number[]) => void) | null) {
    this.audioLevelCallback = callback;
  }

  async startRecording(): Promise<void> {
    try {
      this.isAutoStopTriggered = false; // Reset guard
      
      // Request microphone access with simpler constraints
      console.log("Requesting microphone access...");
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      });

      console.log("Microphone access granted, setting up recorder...");

      // Set up audio context for VAD
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

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

      // Start recording
      this.mediaRecorder.start(1000); // Record in 1-second chunks
      
      // Start silence detection
      this.startSilenceDetection();
      
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

  private startSilenceDetection() {
    if (!this.analyser || !this.dataArray) return;

    this.silenceDetectionInterval = setInterval(() => {
      if (!this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Calculate average audio level
      const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
      
      // Update audio levels for visualizer
      this.audioLevels = Array.from(this.dataArray).map(value => (value / 255) * 100);
      if (this.audioLevelCallback) {
        this.audioLevelCallback(this.audioLevels);
      }

      const now = Date.now();

      if (average < this.silenceThreshold) {
        // Detected silence
        if (this.silenceStartTime === null) {
          this.silenceStartTime = now;
        } else {
          const silenceDuration = now - this.silenceStartTime;
          const secondsLeft = Math.ceil((this.silenceTimeout - silenceDuration) / 1000);
          
          // Update countdown
          if (this.countdownCallback && secondsLeft > 0) {
            this.countdownCallback(secondsLeft);
          }
          
          // Auto-stop if silence duration exceeds threshold
          if (silenceDuration > this.silenceTimeout && !this.isAutoStopTriggered) {
            console.log("Auto-stopping recording due to silence");
            this.isAutoStopTriggered = true; // Set guard
            this.stopSilenceDetection(); // Stop first to prevent multiple calls
            if (this.autoStopCallback) {
              this.autoStopCallback();
            }
          }
        }
      } else {
        // Reset silence detection on sound
        this.silenceStartTime = null;
        if (this.countdownCallback) {
          this.countdownCallback(0); // Reset countdown
        }
      }
    }, 100); // Check every 100ms
  }

  private stopSilenceDetection() {
    if (this.silenceDetectionInterval) {
      clearInterval(this.silenceDetectionInterval);
      this.silenceDetectionInterval = null;
    }
    this.silenceStartTime = null;
    if (this.countdownCallback) {
      this.countdownCallback(0); // Reset countdown
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      // Stop silence detection
      this.stopSilenceDetection();

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    this.stopSilenceDetection();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.analyser = null;
    this.dataArray = null;
    this.audioLevels = [];
    this.isAutoStopTriggered = false;
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  getAudioLevels(): number[] {
    return this.audioLevels;
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
