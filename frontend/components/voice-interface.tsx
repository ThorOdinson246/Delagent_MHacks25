"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Mic, MicOff, Volume2, Send, Calendar, VolumeX, ChevronDown, Maximize2 } from "lucide-react"
import { apiService, type MeetingRequest, type NegotiationResult } from "@/lib/api"
import { ttsService } from "@/lib/tts-service"
import { audioRecorderService } from "@/lib/audio-recorder-service"
import { EnhancedAudioVisualizer } from "./enhanced-audio-visualizer"

export function VoiceInterface({ onExpand }: { onExpand?: () => void }) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [meetingRequest, setMeetingRequest] = useState<MeetingRequest>({
    title: "",
    preferred_date: "",
    preferred_time: "",
    duration_minutes: 60,
  })
  const [negotiationResult, setNegotiationResult] = useState<NegotiationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [audioLevels, setAudioLevels] = useState<number[]>([])
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null)

  const recognition = useRef<any | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognition.current = new SpeechRecognition()
      recognition.current.continuous = true
      recognition.current.interimResults = true
      recognition.current.lang = "en-US"

      recognition.current.onresult = (event: any) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + " " + finalTranscript)
          parseVoiceCommand(finalTranscript)
        }
      }

      recognition.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognition.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const parseVoiceCommand = (command: string) => {
    const lowerCommand = command.toLowerCase()

    // Extract meeting title
    const titleMatch = lowerCommand.match(/schedule (?:a )?(.+?) (?:with|for|on|at|tomorrow|today)/)
    if (titleMatch) {
      setMeetingRequest((prev) => ({ ...prev, title: titleMatch[1] }))
    }

    // Extract date
    if (lowerCommand.includes("tomorrow")) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setMeetingRequest((prev) => ({ ...prev, preferred_date: tomorrow.toISOString().split("T")[0] }))
    } else if (lowerCommand.includes("today")) {
      const today = new Date()
      setMeetingRequest((prev) => ({ ...prev, preferred_date: today.toISOString().split("T")[0] }))
    }

    // Extract time
    const timeMatch = lowerCommand.match(/at (\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
    if (timeMatch) {
      let hour = Number.parseInt(timeMatch[1])
      const minute = timeMatch[2] ? Number.parseInt(timeMatch[2]) : 0
      const ampm = timeMatch[3]

      if (ampm === "pm" && hour !== 12) hour += 12
      if (ampm === "am" && hour === 12) hour = 0

      const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      setMeetingRequest((prev) => ({ ...prev, preferred_time: timeString }))
    }

    // Extract duration
    const durationMatch = lowerCommand.match(/(\d+)\s*(?:minute|min|hour|hr)/)
    if (durationMatch) {
      let duration = Number.parseInt(durationMatch[1])
      if (lowerCommand.includes("hour") || lowerCommand.includes("hr")) {
        duration *= 60
      }
      setMeetingRequest((prev) => ({ ...prev, duration_minutes: duration }))
    }
  }

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
        parseVoiceCommand(transcribedText)
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
        
        // Set up audio level callback for visualizer
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
        
        // Enable VAD with 3-second timeout
        audioRecorderService.enableVAD(true)
        audioRecorderService.setSilenceTimeout(3000)
        audioRecorderService.setSilenceThreshold(12) // Adjust based on testing
        
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

  const handleNegotiateMeeting = async () => {
    if (!meetingRequest.title || !meetingRequest.preferred_date || !meetingRequest.preferred_time) {
      setError("Please provide meeting title, date, and time")
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await apiService.negotiateMeeting(meetingRequest)
      setNegotiationResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to negotiate meeting")
    } finally {
      setLoading(false)
    }
  }

  const handleScheduleMeeting = async (slotIndex: number) => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiService.scheduleMeeting(meetingRequest, slotIndex)
      setNegotiationResult(result)
      if (result.success) {
        // Clear form after successful scheduling
        setMeetingRequest({
          title: "",
          preferred_date: "",
          preferred_time: "",
          duration_minutes: 60,
        })
        setTranscript("")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule meeting")
    } finally {
      setLoading(false)
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
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            Voice Interface
          </div>
          {onExpand && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExpand}
              className="h-8 px-2"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Visualization */}
        <div className="relative h-64 bg-transparent rounded-lg flex items-center justify-center overflow-hidden">
          <EnhancedAudioVisualizer 
            isRecording={isRecording} 
            isProcessing={isListening} 
            audioLevels={audioLevels}
            width={280}
            height={280}
            particleCount={120}
          />
        </div>

        {/* Silence Detection Indicator */}
        {isRecording && silenceCountdown !== null && (
          <div className="text-center mt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-400/30 rounded-full text-yellow-800">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                Auto-stopping in {Math.ceil(silenceCountdown / 1000)}s due to silence
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button
            size="lg"
            onClick={toggleListening}
            disabled={isListening}
            className={
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : isListening 
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
            }
          >
            {isRecording ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Stop Recording
              </>
            ) : isListening ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </>
            )}
          </Button>

          <Button
            size="lg"
            onClick={handleTextToSpeech}
            disabled={!transcript.trim() || isSpeaking}
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="w-5 h-5 mr-2" />
                Speaking...
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 mr-2" />
                Speak Text
              </>
            )}
          </Button>
        </div>

        {/* Enhanced Transcript */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${
                isRecording ? "bg-red-500 animate-pulse" : 
                isListening ? "bg-yellow-500 animate-pulse" : 
                transcript ? "bg-green-500" : "bg-gray-400"
              }`} />
              <h4 className="text-sm font-semibold text-black">
                Live Transcript
              </h4>
            </div>
            {transcript && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTranscript("")}
                className="text-xs h-6 hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                Clear
              </Button>
            )}
          </div>
          <div className={`min-h-[100px] p-4 rounded-xl border-2 transition-all duration-300 ${
            isRecording 
              ? "bg-red-50/50 border-red-200/50 shadow-md shadow-red-100/50" 
              : isListening
              ? "bg-yellow-50/50 border-yellow-200/50 shadow-md shadow-yellow-100/50"
              : transcript
              ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-lg shadow-primary/10"
              : "bg-gray-50/30 border-gray-200/50"
          }`}>
            {transcript ? (
              <div className="space-y-2">
                <p className="text-xs leading-relaxed text-black font-normal">
                  {transcript}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Transcription complete • {transcript.trim() ? transcript.trim().split(/\s+/).length : 0} words
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-primary/10 mb-3">
                    <svg className="w-6 h-6 text-primary/60" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-800 font-medium">
                    {isRecording 
                      ? "Recording in progress..." 
                      : isListening 
                      ? "Processing audio..." 
                      : "Start recording to see your speech transcribed here"
                    }
                  </p>
                  <p className="text-xs text-gray-600">
                    Your voice will be converted to text in real-time
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Meeting Request Form - Collapsible */}
        <Collapsible open={showMoreOptions} onOpenChange={setShowMoreOptions}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-between">
              <span className="text-sm font-medium">More Options</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Manual Meeting Request</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={meetingRequest.title}
                  onChange={(e) => setMeetingRequest((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Meeting title"
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={meetingRequest.duration_minutes}
                  onChange={(e) =>
                    setMeetingRequest((prev) => ({ ...prev, duration_minutes: Number.parseInt(e.target.value) || 60 }))
                  }
                  placeholder="60"
                />
              </div>
              <div>
                <Label htmlFor="date">Preferred Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={meetingRequest.preferred_date}
                  onChange={(e) => setMeetingRequest((prev) => ({ ...prev, preferred_date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="time">Preferred Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={meetingRequest.preferred_time}
                  onChange={(e) => setMeetingRequest((prev) => ({ ...prev, preferred_time: e.target.value }))}
                />
              </div>
            </div>

            <Button
              onClick={handleNegotiateMeeting}
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-blue-500"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {loading ? "Finding Available Slots..." : "Find Available Times"}
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Negotiation Results */}
        {negotiationResult && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Available Time Slots</h4>
            {negotiationResult.available_slots.length === 0 ? (
              <div className="p-3 bg-muted/20 rounded-lg text-sm text-muted-foreground">
                No available slots found for the requested time.
              </div>
            ) : (
              <div className="space-y-2">
                {negotiationResult.available_slots.map((slot, index) => (
                  <div key={index} className="p-3 bg-muted/20 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {slot.day_of_week}, {slot.date_formatted}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {slot.time_formatted} -{" "}
                        {new Date(slot.end_time).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground">Quality Score: {slot.quality_score}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleScheduleMeeting(index)}
                      disabled={loading}
                      className="bg-gradient-to-r from-primary to-blue-500"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Schedule
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isRecording ? "bg-red-500 animate-pulse" : 
              isListening ? "bg-yellow-500 animate-pulse" : 
              "bg-muted-foreground"
            }`} />
            <span className="text-muted-foreground">
              {isRecording ? "Recording..." : 
               isListening ? "Processing..." : 
               "Ready to record"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-orange-500 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-muted-foreground">{isSpeaking ? "Speaking..." : "Ready to speak"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
