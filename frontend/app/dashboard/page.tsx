"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { VoiceInterface } from "@/components/voice-interface"
import { MeetingDashboard } from "@/components/meeting-dashboard"
import { NegotiationView } from "@/components/negotiation-view"
import { AgentStatus } from "@/components/agent-status"
import { FullPageVoiceInterface } from "@/components/full-page-voice-interface"
import { RealTimeNegotiation } from "@/components/real-time-negotiation"
import { RealTimeCalendar } from "@/components/real-time-calendar"

export default function DashboardPage() {
  const [showFullPageVoice, setShowFullPageVoice] = useState(true)

  if (showFullPageVoice) {
    return <FullPageVoiceInterface onClose={() => setShowFullPageVoice(false)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitor your AI agents and manage meeting negotiations in real-time
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <VoiceInterface />
          <AgentStatus />
        </div>

        <RealTimeNegotiation onMeetingScheduled={(meetingId) => {
          console.log("Meeting scheduled:", meetingId)
          // Refresh meeting dashboard
        }} />

        <div className="grid lg:grid-cols-3 gap-6">
          <RealTimeCalendar userId="bob" />
          <RealTimeCalendar userId="alice" />
          <RealTimeCalendar userId="charlie" />
        </div>

        <MeetingDashboard />
        <NegotiationView />
      </main>
    </div>
  )
}
