"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { VoiceInterface } from "@/components/voice-interface"
import { MeetingDashboard } from "@/components/meeting-dashboard"
import { NegotiationView } from "@/components/negotiation-view"
import { AgentStatus } from "@/components/agent-status"
import { FullPageVoiceInterface } from "@/components/full-page-voice-interface"

export default function DashboardPage() {
  const [showFullPageVoice, setShowFullPageVoice] = useState(true)

  if (showFullPageVoice) {
    return (
      <FullPageVoiceInterface onMinimize={() => setShowFullPageVoice(false)} />
    )
  }

  return (
    <div className="min-h-screen grid-pattern">
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
          <VoiceInterface onExpand={() => setShowFullPageVoice(true)} />
          <AgentStatus />
        </div>

        <MeetingDashboard />
        <NegotiationView />
      </main>
    </div>
  )
}
