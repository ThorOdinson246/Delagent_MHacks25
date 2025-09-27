"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Brain, MessageSquare, Target, Settings, Activity } from "lucide-react"
import { useState } from "react"

// Hardcoded data matching the database schema
const userAgents = [
  {
    id: "550e8400-e29b-41d4-a716-446655440020",
    user_id: "550e8400-e29b-41d4-a716-446655440000",
    agent_name: "Alex Scheduler",
    personality_prompt:
      "Professional and diplomatic negotiator who prioritizes work-life balance. Prefers morning meetings and protects focus time aggressively. Uses data-driven arguments and seeks win-win solutions.",
    flexibility_score: 7,
    preferences: {
      meeting_types: ["strategic", "planning", "review"],
      time_preferences: {
        preferred_hours: [9, 10, 11, 14, 15],
        avoid_hours: [12, 17, 18, 19],
        max_meetings_per_day: 4,
      },
      focus_time_protection: true,
      buffer_time_minutes: 15,
    },
    created_at: "2025-09-26T10:00:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440021",
    user_id: "550e8400-e29b-41d4-a716-446655440000",
    agent_name: "Maya Coordinator",
    personality_prompt:
      "Highly flexible and accommodating agent that prioritizes team collaboration. Willing to adjust schedules for group harmony but maintains minimum quality standards for meeting preparation.",
    flexibility_score: 9,
    preferences: {
      meeting_types: ["collaboration", "brainstorming", "team-sync"],
      time_preferences: {
        preferred_hours: [10, 11, 13, 14, 15, 16],
        avoid_hours: [8, 9, 17, 18],
        max_meetings_per_day: 6,
      },
      focus_time_protection: false,
      buffer_time_minutes: 10,
    },
    created_at: "2025-09-26T10:00:00Z",
  },
]

const negotiationMessages = [
  {
    id: "550e8400-e29b-41d4-a716-446655440030",
    negotiation_session_id: "550e8400-e29b-41d4-a716-446655440040",
    from_agent_address: "agent://alex-scheduler-001",
    to_agent_address: "agent://bob-coordinator-002",
    message_type: "proposal",
    proposed_time: "2025-09-28T14:30:00Z",
    reasoning:
      "I'm proposing 2:30 PM as it provides adequate buffer time after the morning focus block and allows for proper meeting preparation. This time slot also avoids the typical lunch hour conflicts.",
    conflicts_identified: {
      lunch_conflict: false,
      focus_time_conflict: false,
      buffer_time_adequate: true,
      preparation_time: "30_minutes",
    },
    round_number: 1,
    created_at: "2025-09-27T10:15:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440031",
    negotiation_session_id: "550e8400-e29b-41d4-a716-446655440040",
    from_agent_address: "agent://bob-coordinator-002",
    to_agent_address: "agent://alex-scheduler-001",
    message_type: "counter_proposal",
    proposed_time: "2025-09-28T15:00:00Z",
    reasoning:
      "I appreciate the 2:30 PM proposal, but Bob has a standing commitment until 2:45 PM on Thursdays. I'm counter-proposing 3:00 PM which gives us a clean start and maintains the afternoon energy level for strategic discussions.",
    conflicts_identified: {
      standing_commitment: true,
      energy_level_optimal: true,
      clean_time_slot: true,
    },
    round_number: 2,
    created_at: "2025-09-27T10:18:00Z",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440032",
    negotiation_session_id: "550e8400-e29b-41d4-a716-446655440040",
    from_agent_address: "agent://alex-scheduler-001",
    to_agent_address: "agent://bob-coordinator-002",
    message_type: "acceptance",
    proposed_time: "2025-09-28T15:00:00Z",
    reasoning:
      "3:00 PM works perfectly. It maintains our buffer requirements and provides optimal conditions for a productive strategic session. I'm confirming this time slot.",
    conflicts_identified: {},
    round_number: 3,
    created_at: "2025-09-27T10:20:00Z",
  },
]

const agentMetrics = {
  "550e8400-e29b-41d4-a716-446655440020": {
    meetings_negotiated: 24,
    success_rate: 87,
    avg_negotiation_rounds: 2.3,
    focus_time_protected: 95,
    user_satisfaction: 4.8,
  },
  "550e8400-e29b-41d4-a716-446655440021": {
    meetings_negotiated: 31,
    success_rate: 94,
    avg_negotiation_rounds: 1.8,
    focus_time_protected: 72,
    user_satisfaction: 4.9,
  },
}

export function AgentDetailView() {
  const [selectedAgent, setSelectedAgent] = useState(userAgents[0])
  const [activeTab, setActiveTab] = useState<"overview" | "negotiations" | "settings">("overview")

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case "proposal":
        return "bg-blue-500/20 border-blue-500/50 text-blue-300"
      case "counter_proposal":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
      case "acceptance":
        return "bg-green-500/20 border-green-500/50 text-green-300"
      case "rejection":
        return "bg-red-500/20 border-red-500/50 text-red-300"
      default:
        return "bg-gray-500/20 border-gray-500/50 text-gray-300"
    }
  }

  return (
    <div className="space-y-6">
      {/* Agent Selection */}
      <div className="flex space-x-4">
        {userAgents.map((agent) => (
          <Button
            key={agent.id}
            variant={selectedAgent.id === agent.id ? "default" : "outline"}
            onClick={() => setSelectedAgent(agent)}
            className="flex items-center space-x-2"
          >
            <Brain className="h-4 w-4" />
            <span>{agent.agent_name}</span>
          </Button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2">
        <Button variant={activeTab === "overview" ? "default" : "outline"} onClick={() => setActiveTab("overview")}>
          Overview
        </Button>
        <Button
          variant={activeTab === "negotiations" ? "default" : "outline"}
          onClick={() => setActiveTab("negotiations")}
        >
          Negotiations
        </Button>
        <Button variant={activeTab === "settings" ? "default" : "outline"} onClick={() => setActiveTab("settings")}>
          Settings
        </Button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Agent Profile */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>{selectedAgent.agent_name}</span>
                  <Badge className="bg-green-500/20 text-green-300">Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Personality & Strategy</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{selectedAgent.personality_prompt}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Flexibility Score</h4>
                  <div className="flex items-center space-x-3">
                    <Progress value={selectedAgent.flexibility_score * 10} className="flex-1" />
                    <span className="text-sm font-medium">{selectedAgent.flexibility_score}/10</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Meeting Preferences</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Preferred Meeting Types</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.preferences.meeting_types.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Max Meetings/Day</p>
                      <p className="text-lg font-medium">
                        {selectedAgent.preferences.time_preferences.max_meetings_per_day}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Time Preferences</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Preferred Hours</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedAgent.preferences.time_preferences.preferred_hours.map((hour) => (
                          <Badge key={hour} className="bg-green-500/20 text-green-300 text-xs">
                            {hour}:00
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Avoid Hours</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedAgent.preferences.time_preferences.avoid_hours.map((hour) => (
                          <Badge key={hour} className="bg-red-500/20 text-red-300 text-xs">
                            {hour}:00
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Metrics */}
          <div className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-medium">{agentMetrics[selectedAgent.id]?.success_rate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Meetings Negotiated</span>
                    <span className="font-medium">{agentMetrics[selectedAgent.id]?.meetings_negotiated}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Avg. Rounds</span>
                    <span className="font-medium">{agentMetrics[selectedAgent.id]?.avg_negotiation_rounds}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Focus Time Protected</span>
                    <span className="font-medium">{agentMetrics[selectedAgent.id]?.focus_time_protected}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">User Satisfaction</span>
                    <span className="font-medium">{agentMetrics[selectedAgent.id]?.user_satisfaction}/5.0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Current Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm font-medium text-blue-300">Active Negotiation</p>
                    <p className="text-xs text-muted-foreground mt-1">Q4 Planning Session - Round 3</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm font-medium text-green-300">Focus Time Protected</p>
                    <p className="text-xs text-muted-foreground mt-1">Morning block secured for tomorrow</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Negotiations Tab */}
      {activeTab === "negotiations" && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Live Negotiation Messages</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {negotiationMessages.map((message) => (
                <div key={message.id} className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getMessageTypeColor(message.message_type)}>
                        {message.message_type.replace("_", " ")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Round {message.round_number}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">From:</span>
                      <span className="font-mono text-xs">{message.from_agent_address}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">To:</span>
                      <span className="font-mono text-xs">{message.to_agent_address}</span>
                    </div>
                    {message.proposed_time && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Proposed Time:</span>
                        <span className="font-medium">{new Date(message.proposed_time).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Agent Reasoning:</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{message.reasoning}</p>
                  </div>

                  {Object.keys(message.conflicts_identified).length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Conflicts Identified:</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(message.conflicts_identified).map(([key, value]) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className={`text-xs ${
                              value === true || value === "true"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-green-500/20 text-green-300"
                            }`}
                          >
                            {key.replace("_", " ")}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Agent Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Agent Name</h4>
                <p className="text-sm text-muted-foreground mb-3">The display name for your AI scheduling agent</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={selectedAgent.agent_name}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
                    readOnly
                  />
                  <Button size="sm">Edit</Button>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Personality Prompt</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Define how your agent negotiates and makes decisions
                </p>
                <textarea
                  value={selectedAgent.personality_prompt}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm h-24 resize-none"
                  readOnly
                />
                <Button size="sm" className="mt-2">
                  Edit Personality
                </Button>
              </div>

              <div>
                <h4 className="font-medium mb-2">Flexibility Score</h4>
                <p className="text-sm text-muted-foreground mb-3">How willing your agent is to compromise (1-10)</p>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={selectedAgent.flexibility_score}
                    className="flex-1"
                    readOnly
                  />
                  <span className="text-sm font-medium w-8">{selectedAgent.flexibility_score}</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Focus Time Protection</h4>
                <p className="text-sm text-muted-foreground mb-3">Automatically protect designated focus time blocks</p>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedAgent.preferences.focus_time_protection}
                    className="rounded"
                    readOnly
                  />
                  <span className="text-sm">Enable focus time protection</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Buffer Time</h4>
                <p className="text-sm text-muted-foreground mb-3">Minimum time between meetings (in minutes)</p>
                <input
                  type="number"
                  value={selectedAgent.preferences.buffer_time_minutes}
                  className="w-24 px-3 py-2 bg-background border border-border rounded-md text-sm"
                  readOnly
                />
              </div>

              <div className="flex space-x-2 pt-4">
                <Button className="bg-gradient-to-r from-primary to-blue-500">Save Changes</Button>
                <Button variant="outline">Reset to Defaults</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
