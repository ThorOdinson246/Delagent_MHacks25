"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, Send, Calendar, X } from "lucide-react"
import { apiService, type MeetingRequest, type NegotiationResult } from "@/lib/api"
import { audioRecorderService } from "@/lib/audio-recorder-service"
import { voiceService } from "@/lib/voice-service"
import { ttsService } from "@/lib/tts-service"
import { EnhancedAudioVisualizer } from "./enhanced-audio-visualizer"

export function FullPageVoiceInterface({ onClose }: { onClose: () => void }) {
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [silenceCountdown, setSilenceCountdown] = useState(0)
  const [audioLevels, setAudioLevels] = useState<number[]>([])

  const recognition = useRef<any | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
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
          parseVoiceCommandFallback(finalTranscript)
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

  const handleVoiceOrchestration = async (transcript: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log("Sending transcript to voice orchestrator:", transcript)
      const result = await voiceService.processVoiceCommand(transcript, "schedule")
      
      console.log("Voice orchestrator response:", result)
      
      if (result.context?.originalRequest) {
        setMeetingRequest(result.context.originalRequest)
      }
      
      if (result.context?.negotiationResult) {
        setNegotiationResult(result.context.negotiationResult)
      }
      
      // Speak the AI-generated response
      if (result.voice_response) {
        console.log("AI response:", result.voice_response)
        if (ttsService) {
          ttsService.speak(result.voice_response, {
            onEnd: () => console.log("TTS completed"),
            onError: (error) => console.error("TTS error:", error)
          })
        } else {
          console.log("TTS not available (server-side rendering)")
        }
      }
      
    } catch (err) {
      console.error("Voice orchestration failed:", err)
      setError(err instanceof Error ? err.message : "Voice command processing failed")
      parseVoiceCommandFallback(transcript)
    } finally {
      setLoading(false)
    }
  }

  const parseVoiceCommandFallback = (command: string) => {
    const lowerCommand = command.toLowerCase()

    const titleMatch = lowerCommand.match(/schedule (?:a )?(.+?) (?:with|for|on|at|tomorrow|today)/)
    if (titleMatch) {
      setMeetingRequest((prev) => ({ ...prev, title: titleMatch[1] }))
    }

    if (lowerCommand.includes("tomorrow")) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setMeetingRequest((prev) => ({ ...prev, preferred_date: tomorrow.toISOString().split("T")[0] }))
    } else if (lowerCommand.includes("today")) {
      const today = new Date()
      setMeetingRequest((prev) => ({ ...prev, preferred_date: today.toISOString().split("T")[0] }))
    }

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
  }

  const stopRecordingAndProcess = async () => {
    if (!isRecording) return
    
    try {
      setIsListening(true)
      setError(null)
      console.log("Stopping recording...")
      
      const audioBlob = await audioRecorderService.stopRecording()
      console.log("Audio recorded, sending for transcription...")
      
      const transcribedText = await audioRecorderService.sendAudioToSTT(audioBlob)
      console.log("Transcription received:", transcribedText)
      
      if (transcribedText.trim()) {
        setTranscript(transcribedText)
        await handleVoiceOrchestration(transcribedText)
      } else {
        setError("No speech detected. Please try speaking louder or closer to the microphone.")
      }
      
      setIsRecording(false)
      setIsListening(false)
      setSilenceCountdown(0)
    } catch (err) {
      console.error("Failed to process recording:", err)
      setError(err instanceof Error ? err.message : "Failed to process recording")
      setIsRecording(false)
      setIsListening(false)
      setSilenceCountdown(0)
    }
  }

  const toggleListening = async () => {
    if (isRecording) {
      await stopRecordingAndProcess()
    } else {
      try {
        setError(null)
        setSilenceCountdown(0)
        console.log("Checking permissions...")
        
        const hasPermission = await audioRecorderService.checkPermissions()
        if (!hasPermission) {
          setError("Microphone permission is required. Please allow microphone access.")
          return
        }
        
        audioRecorderService.setAutoStopCallback(stopRecordingAndProcess)
        audioRecorderService.setCountdownCallback(setSilenceCountdown)
        audioRecorderService.setAudioLevelCallback(setAudioLevels)
        
        console.log("Starting recording...")
        await audioRecorderService.startRecording()
        setIsRecording(true)
        setIsListening(false)
      } catch (err) {
        console.error("Failed to start recording:", err)
        setError(err instanceof Error ? err.message : "Failed to start recording. Please check microphone permissions.")
        setIsRecording(false)
        setIsListening(false)
        setSilenceCountdown(0)
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
      
      if (result.success) {
        // Show success message
        setError(null)
        setSuccessMessage("✅ Meeting scheduled successfully!")
        
        // Clear form and negotiation results after successful scheduling
        setMeetingRequest({
          title: "",
          preferred_date: "",
          preferred_time: "",
          duration_minutes: 60,
        })
        setTranscript("")
        setNegotiationResult(null) // Clear the available slots list
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("")
        }, 3000)
      } else {
        setError("Failed to schedule meeting. Please try again.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule meeting")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white grid-pattern z-50 overflow-auto">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-black">Voice Assistant</h1>
          <Button
            onClick={onClose}
            variant="outline"
            size="icon"
            className="border-gray-300 text-black hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-black">
                <Mic className="w-6 h-6 text-black" />
                Voice Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Voice Visualization */}
              <div className="relative flex items-center justify-center py-8">
                <EnhancedAudioVisualizer 
                  isRecording={isRecording} 
                  isProcessing={isListening} 
                  audioLevels={audioLevels}
                  width={450}
                  height={450}
                  particleCount={150}
                />
                {silenceCountdown > 0 && (
                  <div className="absolute top-4 left-4 bg-yellow-100 border border-yellow-300 text-yellow-700 px-4 py-2 rounded-full text-sm font-medium">
                    Auto-stop in {silenceCountdown}s
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={toggleListening}
                  disabled={isListening}
                  className={`text-lg px-8 py-4 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 animate-pulse text-white"
                      : isListening 
                      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-6 h-6 mr-2" />
                      Stop Recording
                    </>
                  ) : isListening ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Mic className="w-6 h-6 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
              </div>

              {/* Transcript */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-black">
                    Live Transcript 
                    <span className="text-sm text-gray-600 ml-2 font-normal">
                      ({transcript.trim() ? transcript.trim().split(/\s+/).length : 0} words)
                    </span>
                  </h4>
                  {transcript && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTranscript("")}
                      className="text-sm border-gray-300 text-black hover:bg-gray-100"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="min-h-[120px] p-4 bg-gray-50 border border-gray-200 rounded-lg text-base">
                  {transcript ? (
                    <p className="text-black leading-relaxed">{transcript}</p>
                  ) : (
                    <div className="text-gray-500 italic">
                      Start recording to see your speech transcribed here...
                    </div>
                  )}
                </div>
              </div>

              {/* Meeting Request Form */}
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-black">Meeting Request</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="title" className="text-black">Title</Label>
                    <Input
                      id="title"
                      value={meetingRequest.title}
                      onChange={(e) => setMeetingRequest((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Meeting title"
                      className="mt-1 border-gray-300 text-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration" className="text-black">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={meetingRequest.duration_minutes}
                      onChange={(e) =>
                        setMeetingRequest((prev) => ({ ...prev, duration_minutes: Number.parseInt(e.target.value) || 60 }))
                      }
                      placeholder="60"
                      className="mt-1 border-gray-300 text-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="date" className="text-black">Preferred Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={meetingRequest.preferred_date}
                      onChange={(e) => setMeetingRequest((prev) => ({ ...prev, preferred_date: e.target.value }))}
                      className="mt-1 border-gray-300 text-black"
                    />
                  </div>
                  <div>
                    <Label htmlFor="time" className="text-black">Preferred Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={meetingRequest.preferred_time}
                      onChange={(e) => setMeetingRequest((prev) => ({ ...prev, preferred_time: e.target.value }))}
                      className="mt-1 border-gray-300 text-black"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleNegotiateMeeting}
                  disabled={loading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  {loading ? "Finding Available Slots..." : "Find Available Times"}
                </Button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-green-700">
                  {successMessage}
                </div>
              )}

              {/* Negotiation Results */}
              {negotiationResult && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-black">Available Time Slots</h4>
                  {negotiationResult.available_slots.length === 0 ? (
                    <div className="p-4 bg-gray-100 border border-gray-200 rounded-lg text-gray-700">
                      No available slots found for the requested time.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {negotiationResult.available_slots.map((slot, index) => (
                        <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-black">
                              {slot.day_of_week}, {slot.date_formatted}
                            </div>
                            <div className="text-gray-700">
                              {slot.time_formatted} -{" "}
                              {new Date(slot.end_time).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </div>
                            <div className="text-sm text-gray-600">Quality Score: {slot.quality_score}</div>
                            <div className="text-sm text-blue-600 mt-1 font-medium">
                              💡 {slot.explanation}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleScheduleMeeting(index)}
                            disabled={loading}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
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
              <div className="flex items-center justify-center text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isRecording ? "bg-red-500 animate-pulse" : 
                    isListening ? "bg-yellow-500 animate-pulse" : 
                    "bg-gray-400"
                  }`} />
                  <span className="text-gray-600">
                    {isRecording ? "Recording..." : 
                     isListening ? "Processing..." : 
                     "Ready to record"}
                  </span>
                  {silenceCountdown > 0 && (
                    <span className="text-sm text-orange-600 ml-2">
                      (Auto-stop in {silenceCountdown}s)
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
