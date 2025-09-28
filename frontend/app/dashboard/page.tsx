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
  
  // Current user is Bob (Pappu) - his calendar is available on the calendar page
  const currentUser = "bob"
  const otherAgents = ["alice", "charlie"]

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

        <div className="grid lg:grid-cols-3 gap-8">
          <VoiceInterface />
          <div className="lg:col-span-2">
            <AgentStatus />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {otherAgents.map(agent => (
            <RealTimeCalendar key={agent} userId={agent} isCollapsible={true} />
          ))}
        </div>
      </main>
    </div>
  )
}
