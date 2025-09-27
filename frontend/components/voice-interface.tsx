"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, Volume2, Send, Calendar, VolumeX } from "lucide-react"
import { apiService, type MeetingRequest, type NegotiationResult } from "@/lib/api"
import { ttsService } from "@/lib/tts-service"
import { audioRecorderService } from "@/lib/audio-recorder-service"

declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

export function VoiceInterface() {
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

  const recognition = useRef<any | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognition.current = new SpeechRecognition()
      recognition.current.continuous = true
      recognition.current.interimResults = true
      recognition.current.lang = "en-US"

      recognition.current.onresult = (event) => {
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

      recognition.current.onerror = (event) => {
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

  const toggleListening = async () => {
    if (isRecording) {
      // Stop recording and process audio
      try {
        setIsListening(true) // Show processing state
        setError(null)
        console.log("Stopping recording...")
        
        const audioBlob = await audioRecorderService.stopRecording()
        console.log("Audio recorded, sending for transcription...")
        
        const transcribedText = await audioRecorderService.sendAudioToSTT(audioBlob)
        console.log("Transcription received:", transcribedText)
        
        if (transcribedText.trim()) {
          setTranscript((prev) => (prev ? prev + " " : "") + transcribedText)
          parseVoiceCommand(transcribedText)
        }
        
        setIsRecording(false)
        setIsListening(false)
      } catch (err) {
        console.error("Failed to process recording:", err)
        setError(err instanceof Error ? err.message : "Failed to process recording")
        setIsRecording(false)
        setIsListening(false)
      }
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
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          Voice Interface
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Visualization */}
        <div className="relative h-32 bg-muted/20 rounded-lg flex items-center justify-center overflow-hidden">
          {isRecording ? (
            <div className="flex items-center gap-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-red-500 to-orange-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 60 + 20}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          ) : isListening ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Processing audio...</span>
            </div>
          ) : (
            <div className="text-muted-foreground">Click to start recording</div>
          )}
        </div>

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

        {/* Transcript */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Live Transcript</h4>
            {transcript && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTranscript("")}
                className="text-xs h-6"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="min-h-[80px] p-3 bg-muted/20 rounded-lg text-sm border border-border/50">
            {transcript || (
              <div className="text-muted-foreground italic">
                Start recording to see your speech transcribed here...
              </div>
            )}
          </div>
        </div>

        {/* Meeting Request Form */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Meeting Request</h4>
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
        </div>

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
