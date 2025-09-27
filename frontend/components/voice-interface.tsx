"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, MicOff, Volume2, Send, Calendar } from "lucide-react"
import { apiService, type MeetingRequest, type NegotiationResult } from "@/lib/api"

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

  const toggleListening = () => {
    if (!recognition.current) {
      setError("Speech recognition not supported in this browser")
      return
    }

    if (isListening) {
      recognition.current.stop()
      setIsListening(false)
    } else {
      setError(null)
      recognition.current.start()
      setIsListening(true)
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
          {isListening ? (
            <div className="flex items-center gap-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-primary to-blue-500 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 60 + 20}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">Click to start voice input</div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={toggleListening}
            disabled={!recognition.current}
            className={
              isListening
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
            }
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Listening
              </>
            )}
          </Button>
        </div>

        {/* Transcript */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Live Transcript</h4>
          <div className="min-h-[80px] p-3 bg-muted/20 rounded-lg text-sm">
            {transcript || "Say something like: 'Schedule a marketing sync with Bob tomorrow at 2pm for 60 minutes'"}
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
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isListening ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
          <span className="text-muted-foreground">{isListening ? "Listening..." : "Ready to listen"}</span>
        </div>
      </CardContent>
    </Card>
  )
}
