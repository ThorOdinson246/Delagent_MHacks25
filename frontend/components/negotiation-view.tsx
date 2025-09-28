"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowRight, Clock, Zap } from "lucide-react"

export function NegotiationView() {
  const [selectedNegotiation, setSelectedNegotiation] = useState(0)

  const negotiations = [
    {
      id: 1,
      title: "Marketing Sync Negotiation",
      status: "active",
      round: 3,
      maxRounds: 10,
      messages: [
        {
          round: 1,
          from: "Alice's Agent",
          to: "Bob's Agent",
          type: "proposal",
          proposedTime: "2025-09-28T14:00:00Z",
          reasoning: "Alice prefers 2pm as it's after her morning focus block and before her 4pm client call.",
          conflicts: [],
        },
        {
          round: 2,
          from: "Bob's Agent",
          to: "Alice's Agent",
          type: "counter_proposal",
          proposedTime: "2025-09-28T15:00:00Z",
          reasoning: "Bob has a lunch meeting until 2:30pm. Proposing 3pm to allow buffer time.",
          conflicts: ["lunch_meeting_overlap"],
        },
        {
          round: 3,
          from: "Carol's Agent",
          to: "All",
          type: "acceptance",
          proposedTime: "2025-09-28T15:00:00Z",
          reasoning: "3pm works perfectly for Carol. No conflicts detected in calendar.",
          conflicts: [],
        },
      ],
    },
  ]

  const currentNegotiation = negotiations[selectedNegotiation]

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Live Negotiation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Negotiation Header */}
        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
          <div>
            <h3 className="font-semibold">{currentNegotiation.title}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span>
                Round {currentNegotiation.round}/{currentNegotiation.maxRounds}
              </span>
              <Badge variant="secondary" className="status-negotiating">
                {currentNegotiation.status}
              </Badge>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-muted-foreground">Progress</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
                  style={{ width: `${(currentNegotiation.round / currentNegotiation.maxRounds) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round((currentNegotiation.round / currentNegotiation.maxRounds) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Message Timeline */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Negotiation Timeline
          </h4>

          <div className="space-y-4">
            {currentNegotiation.messages.map((message, index) => (
              <div key={index} className="relative">
                {/* Timeline connector */}
                {index < currentNegotiation.messages.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-16 bg-border" />
                )}

                <div className="flex gap-4">
                  {/* Round indicator */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{message.round}</span>
                  </div>

                  {/* Message content */}
                  <div className="flex-1 p-4 bg-muted/20 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{message.from}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{message.to}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {message.type.replace("_", " ")}
                      </Badge>
                    </div>

                    {message.proposedTime && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-medium">{new Date(message.proposedTime).toLocaleString()}</span>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground leading-relaxed">{message.reasoning}</p>

                    {message.conflicts.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {message.conflicts.map((conflict, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {conflict.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live status */}
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium">Agents are actively negotiating...</span>
          </div>
          <Button size="sm" variant="outline">
            View Full Log
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
