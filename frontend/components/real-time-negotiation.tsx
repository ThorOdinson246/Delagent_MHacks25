"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Mic, MicOff, Volume2, VolumeX, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface NegotiationMessage {
  type: string
  message: string
  timestamp: string
  slots?: any[]
  meeting_id?: string
  meeting_details?: any
}

interface RealTimeNegotiationProps {
  onMeetingScheduled?: (meetingId: string) => void
}

export function RealTimeNegotiation({ onMeetingScheduled }: RealTimeNegotiationProps) {
  const [messages, setMessages] = useState<NegotiationMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [currentMeeting, setCurrentMeeting] = useState<any>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const recognitionRef = useRef<any>(null)

  // Initialize connection status (WebSocket disabled for now)
  useEffect(() => {
    setIsConnected(true)
    addMessage({
      type: "system",
      message: "🔗 Connected to agent negotiation system",
      timestamp: new Date().toISOString()
    })
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
        addMessage({
          type: "system",
          message: "🎤 Listening for voice input...",
          timestamp: new Date().toISOString()
        })
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        addMessage({
          type: "user_voice",
          message: `🎤 You said: "${transcript}"`,
          timestamp: new Date().toISOString()
        })
        handleVoiceInput(transcript)
      }

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
        addMessage({
          type: "system",
          message: `❌ Speech recognition error: ${event.error}`,
          timestamp: new Date().toISOString()
        })
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const addMessage = (message: NegotiationMessage) => {
    if (message && typeof message === 'object') {
      setMessages(prev => {
        const currentMessages = Array.isArray(prev) ? prev : []
        return [...currentMessages, message]
      })
      
      // Auto-scroll to bottom
      setTimeout(() => {
        const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight
        }
      }, 100)
    }
  }

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && text && typeof text === 'string') {
      try {
        // Stop any current speech
        speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 0.8

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        speechSynthesisRef.current = utterance
        speechSynthesis.speak(utterance)
      } catch (error) {
        console.error("Error with speech synthesis:", error)
        setIsSpeaking(false)
      }
    }
  }

  const handleNegotiationUpdate = (data: any) => {
    // Handle negotiation updates from API responses
    if (data.message) {
      addMessage({
        type: "negotiation_result",
        message: data.message,
        timestamp: new Date().toISOString()
      })
      speak(data.message)
    }

    if (data.available_slots && Array.isArray(data.available_slots)) {
      setAvailableSlots(data.available_slots)
    }

    if (data.meeting_id && onMeetingScheduled) {
      onMeetingScheduled(data.meeting_id)
      setCurrentMeeting(null)
      setAvailableSlots([])
    }
  }

  const handleVoiceInput = (transcript: string) => {
    if (!transcript || typeof transcript !== 'string') return
    
    // Parse voice input and trigger meeting request
    const lowerTranscript = transcript.toLowerCase()
    
    if (lowerTranscript.includes("schedule") || lowerTranscript.includes("meeting")) {
      // Extract meeting details from voice input
      const title = extractMeetingTitle(transcript)
      const date = extractDate(transcript)
      const time = extractTime(transcript)
      const duration = extractDuration(transcript)
      
      if (title && date && time && duration) {
        triggerMeetingRequest({
          title,
          preferred_date: date,
          preferred_time: time,
          duration_minutes: duration,
          is_ai_agent_meeting: true
        })
      } else {
        addMessage({
          type: "system",
          message: "❌ Please provide meeting title, date, time, and duration",
          timestamp: new Date().toISOString()
        })
        speak("Please provide meeting title, date, time, and duration")
      }
    }
  }

  const extractMeetingTitle = (text: string): string => {
    if (!text || typeof text !== 'string') return "Voice Meeting"
    // Simple extraction logic - can be enhanced
    const match = text.match(/schedule (?:a )?meeting (?:called )?["']?([^"']+)["']?/i)
    return match ? match[1] : "Voice Meeting"
  }

  const extractDate = (text: string): string => {
    if (!text || typeof text !== 'string') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    }
    
    // Extract date patterns like "tomorrow", "next monday", "october 1st"
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    if (text.includes("tomorrow")) {
      return tomorrow.toISOString().split('T')[0]
    }
    
    // Default to tomorrow for now
    return tomorrow.toISOString().split('T')[0]
  }

  const extractTime = (text: string): string => {
    if (!text || typeof text !== 'string') return "14:00"
    
    // Extract time patterns like "2 PM", "14:00", "2 o'clock"
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (timeMatch) {
      let hour = parseInt(timeMatch[1])
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
      const period = timeMatch[3]?.toLowerCase()
      
      if (period === 'pm' && hour !== 12) hour += 12
      if (period === 'am' && hour === 12) hour = 0
      
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
    
    return "14:00" // Default to 2 PM
  }

  const extractDuration = (text: string): number => {
    if (!text || typeof text !== 'string') return 60
    
    // Extract duration patterns like "1 hour", "30 minutes", "90 minutes"
    const durationMatch = text.match(/(\d+)\s*(hour|minute|min)/i)
    if (durationMatch) {
      const value = parseInt(durationMatch[1])
      const unit = durationMatch[2].toLowerCase()
      return unit === 'hour' ? value * 60 : value
    }
    
    return 60 // Default to 1 hour
  }

  const triggerMeetingRequest = async (meetingRequest: any) => {
    if (!meetingRequest || typeof meetingRequest !== 'object') {
      console.error("Invalid meeting request:", meetingRequest)
      return
    }
    
    try {
      // Add negotiation start message
      addMessage({
        type: "negotiation_start",
        message: `🤖 Starting negotiation for '${meetingRequest.title || 'Unknown Meeting'}'`,
        timestamp: new Date().toISOString()
      })
      speak(`Starting negotiation for ${meetingRequest.title || 'Unknown Meeting'}`)
      
      setCurrentMeeting({ title: meetingRequest.title || 'Unknown Meeting' })

      const response = await fetch("http://localhost:8000/negotiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meetingRequest),
      })

      if (response.ok) {
        const result = await response.json()
        handleNegotiationUpdate(result)
        
        if (result.success && result.available_slots && Array.isArray(result.available_slots) && result.available_slots.length > 0) {
          // Auto-schedule the first available slot
          await scheduleMeeting(meetingRequest, 0)
        }
      } else {
        addMessage({
          type: "system",
          message: "❌ Error processing meeting request",
          timestamp: new Date().toISOString()
        })
        speak("Error processing meeting request")
      }
    } catch (error) {
      console.error("Error triggering meeting request:", error)
      addMessage({
        type: "system",
        message: "❌ Error processing meeting request",
        timestamp: new Date().toISOString()
      })
      speak("Error processing meeting request")
    }
  }

  const scheduleMeeting = async (meetingRequest: any, slotIndex: number) => {
    if (!meetingRequest || typeof meetingRequest !== 'object' || typeof slotIndex !== 'number') {
      console.error("Invalid parameters for scheduleMeeting:", { meetingRequest, slotIndex })
      return
    }
    
    try {
      addMessage({
        type: "scheduling_start",
        message: `📅 Scheduling meeting '${meetingRequest.title || 'Unknown Meeting'}'`,
        timestamp: new Date().toISOString()
      })
      speak(`Scheduling meeting ${meetingRequest.title || 'Unknown Meeting'}`)

      const response = await fetch(`http://localhost:8000/schedule?slot_index=${slotIndex}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meetingRequest),
      })

      if (response.ok) {
        const result = await response.json()
        if (result && result.success) {
          addMessage({
            type: "meeting_scheduled",
            message: `✅ Meeting '${meetingRequest.title}' scheduled successfully!`,
            timestamp: new Date().toISOString()
          })
          speak(`Meeting ${meetingRequest.title} scheduled successfully!`)
          toast.success("Meeting scheduled successfully!")
          
          if (result.meeting_id && onMeetingScheduled) {
            onMeetingScheduled(result.meeting_id)
          }
          setCurrentMeeting(null)
          setAvailableSlots([])
        } else {
          addMessage({
            type: "scheduling_error",
            message: "❌ Failed to schedule meeting",
            timestamp: new Date().toISOString()
          })
          speak("Failed to schedule meeting")
        }
      }
    } catch (error) {
      console.error("Error scheduling meeting:", error)
      addMessage({
        type: "scheduling_error",
        message: "❌ Error scheduling meeting",
        timestamp: new Date().toISOString()
      })
      speak("Error scheduling meeting")
    }
  }

  const startListening = () => {
    try {
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start()
      }
    } catch (error) {
      console.error("Error starting voice recognition:", error)
      setIsListening(false)
    }
  }

  const stopListening = () => {
    try {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop()
      }
    } catch (error) {
      console.error("Error stopping voice recognition:", error)
      setIsListening(false)
    }
  }

  const toggleSpeech = () => {
    try {
      if (isSpeaking && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    } catch (error) {
      console.error("Error toggling speech:", error)
    }
  }

  const clearMessages = () => {
    try {
      setMessages([])
      setAvailableSlots([])
      setCurrentMeeting(null)
    } catch (error) {
      console.error("Error clearing messages:", error)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🤖 Real-Time Agent Negotiation</span>
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={clearMessages}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Voice Controls */}
            <div className="flex items-center space-x-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center space-x-2">
                <Button
                  variant={isListening ? "destructive" : "default"}
                  size="sm"
                  onClick={isListening ? stopListening : startListening}
                  disabled={!isConnected}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isListening ? "Stop" : "Start"} Listening
                </Button>
                <Button
                  variant={isSpeaking ? "destructive" : "outline"}
                  size="sm"
                  onClick={toggleSpeech}
                >
                  {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isSpeaking ? "Stop" : "Speech"}
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                Say: "Schedule a meeting called Team Standup for tomorrow at 2 PM for 30 minutes"
              </div>
            </div>

            {/* Current Meeting Status */}
            {currentMeeting && currentMeeting.title && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900">Current Meeting</h3>
                <p className="text-blue-700">{currentMeeting.title}</p>
              </div>
            )}

            {/* Available Slots */}
            {availableSlots && Array.isArray(availableSlots) && availableSlots.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Available Time Slots</h3>
                <div className="space-y-2">
                  {availableSlots.map((slot, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="text-sm">
                        {slot.day_of_week || 'Unknown'}, {slot.date_formatted || 'Unknown'} at {slot.time_formatted || 'Unknown'}
                      </span>
                      <Badge variant="outline">Score: {slot.quality_score || 0}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="h-96 w-full border rounded-lg">
              <div className="p-4 space-y-2">
                {messages && Array.isArray(messages) && messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      message.type === "system"
                        ? "bg-muted"
                        : message.type === "user_voice"
                        ? "bg-blue-50 border border-blue-200"
                        : message.type === "negotiation_start"
                        ? "bg-yellow-50 border border-yellow-200"
                        : message.type === "agent_communication"
                        ? "bg-purple-50 border border-purple-200"
                        : message.type === "negotiation_result"
                        ? "bg-green-50 border border-green-200"
                        : message.type === "meeting_scheduled"
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm">{message.message || 'No message'}</p>
                      <span className="text-xs text-muted-foreground ml-2">
                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : 'Unknown time'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
