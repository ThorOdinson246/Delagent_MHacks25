class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

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

      // Start recording
      this.mediaRecorder.start(1000); // Record in 1-second chunks
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

  private cleanup(): void {
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
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const response = await fetch('/api/stt', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.transcript || "";
  }
}

export const audioRecorderService = new AudioRecorderService();
