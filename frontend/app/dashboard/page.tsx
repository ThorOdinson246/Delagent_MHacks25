"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { VoiceInterface } from "@/components/voice-interface"
import { MeetingDashboard } from "@/components/meeting-dashboard"
import { NegotiationView } from "@/components/negotiation-view"
import { AgentStatus } from "@/components/agent-status"
import { RealTimeNegotiation } from "@/components/real-time-negotiation"
import { RealTimeCalendar } from "@/components/real-time-calendar"
import { AgentInteractionFeed } from "@/components/agent-interaction-feed"

export default function DashboardPage() {
  // Current user is Bob (Pappu) - his calendar is available on the calendar page
  const currentUser = "bob"
  const otherAgents = ["alice", "charlie"]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50">
      <Header />
      <main className="container mx-auto px-6 py-12 space-y-12">
        {/* Header Section with improved spacing */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Monitor your AI agents and manage meeting negotiations in real-time
            </p>
          </div>
        </div>

        {/* Main Components Grid with better spacing */}
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-1">
            <VoiceInterface />
          </div>
          <div className="lg:col-span-1">
            <AgentInteractionFeed />
          </div>
          <div className="lg:col-span-1">
            <AgentStatus />
          </div>
        </div>

        {/* Calendar Section with improved spacing */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Team Calendars
          </h2>
          <div className="grid lg:grid-cols-2 gap-8">
            {otherAgents.map(agent => (
              <RealTimeCalendar key={agent} userId={agent} isCollapsible={true} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
