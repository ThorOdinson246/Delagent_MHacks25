"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { VoiceInterface } from "@/components/voice-interface"
import { MeetingDashboard } from "@/components/meeting-dashboard"
import { NegotiationView } from "@/components/negotiation-view"
import { RealTimeNegotiation } from "@/components/real-time-negotiation"
import { RealTimeCalendar } from "@/components/real-time-calendar"
import { AgentInteractionFeed } from "@/components/agent-interaction-feed"

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false)
  
  // Current user is Bob (Pappu) - his calendar is available on the calendar page
  const currentUser = "bob"
  const otherAgents = ["alice", "charlie"]

  // Ensure client-side hydration
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Show loading state during SSR to prevent hydration mismatch
  if (!isClient) {
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
                Loading...
              </p>
            </div>
          </div>
        </main>
      </div>
    )
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
              Watch live AI agent negotiations powered by Gemini - Alice, Bob, and Charlie debate real scheduling conflicts
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="lg:col-span-1">
            <VoiceInterface />
          </div>
          <div className="lg:col-span-1">
            <AgentInteractionFeed />
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
