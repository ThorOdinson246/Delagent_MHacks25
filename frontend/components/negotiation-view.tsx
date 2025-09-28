"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, ArrowRight, Clock, Zap, Brain } from "lucide-react"
import { websocketService } from "@/lib/websocket-service"

interface AgentMessage {
  round: number;
  from: string;
  to?: string;
  type: string;
  message: string;
  reasoning: string;
  timestamp: string;
  proposedTime?: string;
  conflicts?: string[];
}

interface Negotiation {
  id: number;
  title: string;
  status: string;
  round: number;
  maxRounds: number;
  messages: AgentMessage[];
}

export function NegotiationView() {
  const [selectedNegotiation, setSelectedNegotiation] = useState(0)
  const [negotiations, setNegotiations] = useState<Negotiation[]>([
    {
      id: 1,
      title: "Live Agent Negotiation",
      status: "waiting",
      round: 0,
      maxRounds: 10,
      messages: [],
    },
  ])

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    websocketService.connect();

    // Listen for agent reasoning messages
    const handleAgentReasoning = (event: CustomEvent) => {
      const data = event.detail;
      console.log('Received agent reasoning:', data);
      
      if (data.type === 'agent_reasoning') {
        const newMessage: AgentMessage = {
          round: negotiations[0].round + 1,
          from: data.agent || 'Agent',
          type: 'reasoning',
          message: data.message || '',
          reasoning: data.reasoning || '',
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setNegotiations(prev => {
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            status: 'active',
            round: updated[0].round + 1,
            messages: [...updated[0].messages, newMessage]
          };
          return updated;
        });
      } else if (data.type === 'negotiation_start') {
        // Reset negotiation when a new one starts
        setNegotiations(prev => {
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            title: data.message?.includes("'") ? 
              data.message.split("'")[1] + " Negotiation" : 
              "Live Agent Negotiation",
            status: 'active',
            round: 0,
            messages: []
          };
          return updated;
        });
      } else if (data.type === 'negotiation_result') {
        // Mark negotiation as completed
        setNegotiations(prev => {
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            status: 'completed'
          };
          return updated;
        });
      }
    };

    // Listen for WebSocket events
    window.addEventListener('negotiation-update', handleAgentReasoning as EventListener);
    
    // Also listen directly to WebSocket messages
    websocketService.on('message', (data) => {
      try {
        const parsedData = JSON.parse(data);
        handleAgentReasoning({ detail: parsedData } as CustomEvent);
      } catch (e) {
        console.log('Non-JSON WebSocket message:', data);
      }
    });

    return () => {
      window.removeEventListener('negotiation-update', handleAgentReasoning as EventListener);
      websocketService.disconnect();
    };
  }, [negotiations]);

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

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {currentNegotiation.messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Waiting for agent negotiation to begin...</p>
                <p className="text-sm">Start a voice command to see AI agents debate in real-time</p>
              </div>
            ) : (
              currentNegotiation.messages.map((message, index) => (
                <div key={index} className="relative animate-in slide-in-from-bottom-2 duration-500">
                  {/* Timeline connector */}
                  {index < currentNegotiation.messages.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-border" />
                  )}

                  <div className="flex gap-4">
                    {/* Agent indicator */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>

                    {/* Message content */}
                    <div className="flex-1 p-4 bg-muted/20 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{message.from}</span>
                          {message.to && (
                            <>
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">{message.to}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {message.type.replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">{message.message}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed italic">
                          "{message.reasoning}"
                        </p>
                      </div>

                      {message.proposedTime && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-medium">{new Date(message.proposedTime).toLocaleString()}</span>
                        </div>
                      )}

                      {message.conflicts && message.conflicts.length > 0 && (
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
              ))
            )}
          </div>
        </div>

        {/* Live status */}
        <div className={`flex items-center justify-between p-4 border rounded-lg ${
          currentNegotiation.status === 'active' 
            ? 'bg-primary/10 border-primary/20' 
            : currentNegotiation.status === 'completed'
            ? 'bg-green-500/10 border-green-500/20'
            : 'bg-muted/10 border-muted/20'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              currentNegotiation.status === 'active' 
                ? 'bg-primary animate-pulse' 
                : currentNegotiation.status === 'completed'
                ? 'bg-green-500'
                : 'bg-muted-foreground'
            }`} />
            <span className="text-sm font-medium">
              {currentNegotiation.status === 'active' && 'Agents are actively negotiating...'}
              {currentNegotiation.status === 'completed' && 'Negotiation completed successfully'}
              {currentNegotiation.status === 'waiting' && 'Waiting for negotiation to start'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {currentNegotiation.messages.length} messages
            </span>
            <Button size="sm" variant="outline" onClick={() => {
              // Clear messages for demo
              setNegotiations(prev => {
                const updated = [...prev];
                updated[0] = {
                  ...updated[0],
                  status: 'waiting',
                  round: 0,
                  messages: []
                };
                return updated;
              });
            }}>
              Clear Log
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
