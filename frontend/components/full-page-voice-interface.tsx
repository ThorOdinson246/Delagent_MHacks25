"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, Volume2, VolumeX, Minimize2, X } from "lucide-react"
import { audioRecorderService } from "@/lib/audio-recorder-service"
import { ttsService } from "@/lib/tts-service"
import { EnhancedAudioVisualizer } from "./enhanced-audio-visualizer"

interface FullPageVoiceInterfaceProps {
  onMinimize: () => void
}

export function FullPageVoiceInterface({ onMinimize }: FullPageVoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(32).fill(0))
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null)

  // Initialize audio levels array
  useEffect(() => {
    if (!isRecording) {
      setAudioLevels(Array(32).fill(0))
    }
  }, [isRecording])

  const stopRecordingAndProcess = async () => {
    try {
      setIsListening(true) // Show processing state
      setError(null)
      console.log("Stopping recording...")
      
      const audioBlob = await audioRecorderService.stopRecording()
      console.log("Audio recorded, sending for transcription...")
      
      const transcribedText = await audioRecorderService.sendAudioToSTT(audioBlob)
      console.log("Transcription received:", transcribedText)
      
      if (transcribedText.trim()) {
        setTranscript(transcribedText) // Replace instead of appending
      } else {
        console.log("Empty transcription received")
        setTranscript("") // Clear transcript if empty
        setError("No speech detected. Please try speaking more clearly.")
      }
      
      setIsRecording(false)
      setIsListening(false)
      setSilenceCountdown(null) // Clear countdown
    } catch (err) {
      console.error("Failed to process recording:", err)
      setError(err instanceof Error ? err.message : "Failed to process recording")
      setIsRecording(false)
      setIsListening(false)
      setSilenceCountdown(null) // Clear countdown
    }
  }

  const toggleListening = async () => {
    if (isRecording) {
      // Stop recording manually
      await stopRecordingAndProcess()
    } else {
      // Start recording
      try {
        setError(null)
        console.log("Checking permissions...")
        
        const hasPermission = await audioRecorderService.checkPermissions()
        if (!hasPermission) {
          setError("Microphone permission is required. Please allow microphone access.")
          return
        }
        
        console.log("Starting recording...")
        
        // Set up real-time audio level callback
        audioRecorderService.setAudioLevelCallback((levels) => {
          setAudioLevels(levels)
        })
        
        // Set up silence countdown callback
        audioRecorderService.setSilenceCountdownCallback((remainingTime) => {
          setSilenceCountdown(remainingTime)
        })
        
        // Set up auto-stop callback for voice activity detection
        audioRecorderService.setAutoStopCallback(() => {
          console.log("Auto-stopping recording due to silence")
          setSilenceCountdown(null) // Clear countdown
          stopRecordingAndProcess() // This will handle the stop and transcription
        })
        
        // Enable VAD with 4-second timeout for full-page (slightly longer)
        audioRecorderService.enableVAD(true)
        audioRecorderService.setSilenceTimeout(4000)
        audioRecorderService.setSilenceThreshold(12)
        
        await audioRecorderService.startRecording()
        setIsRecording(true)
        setIsListening(false) // We're recording, not processing
      } catch (err) {
        console.error("Failed to start recording:", err)
        setError(err instanceof Error ? err.message : "Failed to start recording. Please check microphone permissions.")
        setIsRecording(false)
        setIsListening(false)
      }
    }
  }

  const handleTextToSpeech = async () => {
    if (!transcript.trim()) {
      setError("No text to convert to speech")
      return
    }

    try {
      setIsSpeaking(true)
      setError(null)
      console.log("Converting text to speech:", transcript)
      await ttsService.textToSpeechSimple(transcript)
      console.log("Text-to-speech completed successfully")
      setIsSpeaking(false)
    } catch (err) {
      console.error("TTS Error:", err)
      // Fallback to browser's native speech synthesis
      console.log("Falling back to browser speech synthesis")
      handleFallbackTTS()
    }
  }

  const handleFallbackTTS = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(transcript)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      
      utterance.onend = () => {
        console.log("Fallback TTS completed")
        setIsSpeaking(false)
      }
      
      utterance.onerror = (event) => {
        console.error("Fallback TTS error:", event)
        setError("Failed to synthesize speech")
        setIsSpeaking(false)
      }
      
      console.log("Starting fallback speech synthesis")
      speechSynthesis.speak(utterance)
    } else {
      setError("Speech synthesis not supported in this browser")
      setIsSpeaking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white grid-pattern">
      {/* Header with minimize button */}
      <div className="flex justify-between items-center p-6">
        <div className="text-black">
          <h1 className="text-2xl font-bold text-black">Voice Assistant</h1>
          <p className="text-gray-600">Ready to listen</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onMinimize}
          className="bg-black/10 border-black/20 text-black hover:bg-black/20"
        >
          <Minimize2 className="w-4 h-4 mr-2" />
          Minimize
        </Button>
      </div>

      {/* Main voice interface */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Voice Visualizer */}
        <EnhancedAudioVisualizer 
          isRecording={isRecording} 
          isProcessing={isListening} 
          audioLevels={audioLevels}
          width={450}
          height={450}
          particleCount={150}
        />

        {/* Silence Detection Indicator */}
        {isRecording && silenceCountdown !== null && (
          <div className="mt-8">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-yellow-100 backdrop-blur-sm border border-yellow-300 rounded-2xl text-yellow-800">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-lg font-medium">
                Auto-stopping in {Math.ceil(silenceCountdown / 1000)}s due to silence
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mt-12 flex gap-6">
          <Button
            size="lg"
            onClick={toggleListening}
            disabled={isListening}
            className={`px-8 py-4 text-lg font-semibold ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse text-white"
                : isListening 
                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                : "bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-6 h-6 mr-3" />
                Stop Recording
              </>
            ) : isListening ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Processing...
              </>
            ) : (
              <>
                <Mic className="w-6 h-6 mr-3" />
                Start Recording
              </>
            )}
          </Button>

          <Button
            size="lg"
            onClick={handleTextToSpeech}
            disabled={!transcript.trim() || isSpeaking}
            className="px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-6 h-6 mr-3" />
                Speaking...
              </>
            ) : (
              <>
                <Volume2 className="w-6 h-6 mr-3" />
                Speak Text
              </>
            )}
          </Button>
        </div>

        {/* Enhanced Transcript */}
        {transcript && (
          <div className="mt-8 max-w-3xl w-full">
            <div className="bg-gradient-to-br from-black/10 to-black/5 backdrop-blur-md rounded-2xl p-8 border border-black/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-black font-semibold text-lg">
                  Voice Transcript
                </h3>
                <div className="flex-1" />
                <div className="text-xs text-black/60 bg-black/10 px-2 py-1 rounded-full">
                  {transcript.trim() ? transcript.trim().split(/\s+/).length : 0} words
                </div>
              </div>
              <div className="bg-black/5 rounded-xl p-6 border border-black/10">
                <p className="text-black text-sm leading-relaxed font-normal tracking-wide">
                  {transcript}
                </p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2 text-black/60 text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Transcription complete
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTranscript("")}
                  className="bg-black/10 border-black/20 text-black hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-600 transition-all"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 max-w-md w-full">
            <div className="bg-red-100 backdrop-blur-sm rounded-lg p-4 border border-red-300">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="mt-8 flex items-center gap-6 text-gray-600">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isRecording ? "bg-red-500 animate-pulse" : 
              isListening ? "bg-yellow-500 animate-pulse" : 
              "bg-gray-400"
            }`} />
            <span>
              {isRecording ? "Recording..." : 
               isListening ? "Processing..." : 
               "Ready to record"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isSpeaking ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            <span>{isSpeaking ? "Speaking..." : "Ready to speak"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
